import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import type { CommandRunEvent } from '../../shared/types/commands.js';
import * as fs from 'node:fs/promises';
import express from 'express';
import supertest from 'supertest';
import { ALLOWLISTED_CMDLETS } from '../../shared/types/commands.js';
import { errorHandler } from '../middleware/security.js';

// vi.mock is hoisted above all imports — service and router load with mocked modules
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(() => ({ error: null, status: 0, stdout: 'PowerShell 7.4.0\n' })),
}));

vi.mock('node:fs/promises');

import * as childProcess from 'node:child_process';
import { commandsRouter } from './commands.js';
// Direct service import — same singleton, shares mocked child_process
import { runCommand, stopCommand } from '../services/commands.js';

// ── Fake ChildProcess factory ────────────────────────────────────────────

type FakeProc = ChildProcess & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
  _triggerClose: (code: number | null) => void;
  _closed: boolean;
};

function makeFakeProc(onKill?: () => void): FakeProc {
  const proc = new EventEmitter() as FakeProc;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc._closed = false;
  proc._triggerClose = (code: number | null) => {
    if (!proc._closed) {
      proc._closed = true;
      proc.emit('close', code);
    }
  };
  proc.kill = vi.fn(() => {
    if (onKill) onKill();
  });
  return proc;
}

// scheduleClose: defer close so HTTP handler attaches listeners before the event fires.
// Use ONLY for supertest tests where we await the response immediately after.
// DO NOT use this for "fire-and-forget first request, then send second" patterns — those
// must use direct service calls to avoid supertest's lazy request startup timing.
function scheduleClose(proc: FakeProc, code: number | null = 0, delay = 20): void {
  setTimeout(() => proc._triggerClose(code), delay);
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', commandsRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.mocked(fs.readFile).mockResolvedValue('[]' as unknown as Uint8Array);
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  vi.mocked(fs.rename).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.readFile).mockResolvedValue('[]' as unknown as Uint8Array);
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  vi.mocked(fs.rename).mockResolvedValue(undefined);
});

// ── Allowlist tests (RUN-04) ─────────────────────────────────────────────

describe('commands allowlist (RUN-04)', () => {
  // Tests router Zod validation returns 400 for unrecognised cmdlets
  it('rejects cmdlet not in ALLOWLISTED_CMDLETS with 400', async () => {
    const res = await supertest(buildApp())
      .post('/run')
      .send({ cmdlet: 'Invoke-DangerousThing', parameters: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or disallowed/i);
  });

  // Tests router Zod validation passes for all 13 allowlisted cmdlets (no 400)
  it('accepts every cmdlet in ALLOWLISTED_CMDLETS without throwing', async () => {
    const app = buildApp();
    for (const cmdlet of ALLOWLISTED_CMDLETS) {
      const proc = makeFakeProc();
      vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);
      scheduleClose(proc, 0, 15);
      const res = await supertest(app).post('/run').send({ cmdlet, parameters: {} });
      // Allow module state to reset before next iteration
      await new Promise<void>(resolve => setTimeout(resolve, 10));
      expect(res.status).not.toBe(400);
    }
  });

  it('ALLOWLISTED_CMDLETS does not contain Invoke-EntraOpsAzGraphQuery', () => {
    expect(ALLOWLISTED_CMDLETS).not.toContain('Invoke-EntraOpsAzGraphQuery');
  });

  it('ALLOWLISTED_CMDLETS does not contain Invoke-EntraOpsMsGraphQuery', () => {
    expect(ALLOWLISTED_CMDLETS).not.toContain('Invoke-EntraOpsMsGraphQuery');
  });

  it('ALLOWLISTED_CMDLETS does not contain Invoke-EntraOpsGraphSecurityQuery', () => {
    expect(ALLOWLISTED_CMDLETS).not.toContain('Invoke-EntraOpsGraphSecurityQuery');
  });
});

// ── Concurrency tests (RUN-05) ───────────────────────────────────────────
// Use direct service calls — supertest's lazy request startup breaks "fire-and-forget"
// patterns needed for concurrency testing.

describe('commands concurrency (RUN-05)', () => {
  it('returns 409 when a process is already running', () => {
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);
    runCommand(ALLOWLISTED_CMDLETS[0], {}, vi.fn(), vi.fn());
    // activeProcess is set — second call must throw with status 409

    expect(() => runCommand(ALLOWLISTED_CMDLETS[0], {}, vi.fn(), vi.fn()))
      .toThrow('A command is already running');

    proc._triggerClose(0); // reset state
  });

  it('allows run after previous process exited', () => {
    const proc1 = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc1 as unknown as ChildProcess);
    runCommand(ALLOWLISTED_CMDLETS[0], {}, vi.fn(), vi.fn());
    proc1._triggerClose(0); // close handler sets activeProcess = null

    const proc2 = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc2 as unknown as ChildProcess);
    expect(() => runCommand(ALLOWLISTED_CMDLETS[0], {}, vi.fn(), vi.fn())).not.toThrow();
    proc2._triggerClose(0); // cleanup
  });
});

// ── History tests (RUN-06) ───────────────────────────────────────────────
// Most tests via supertest (uses scheduleClose — works because response is awaited
// immediately after scheduling, giving the route handler time to attach listeners).
// "outcome is stopped" uses direct service call to avoid the fire-and-forget timeout issue.

describe('commands history (RUN-06)', () => {
  it('writes a RunHistoryRecord on completion with all required fields (id, cmdlet, parameters, startedAt, endedAt, durationSeconds, outcome)', async () => {
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    scheduleClose(proc, 0, 15);
    await supertest(buildApp())
      .post('/run')
      .send({ cmdlet: ALLOWLISTED_CMDLETS[0], parameters: { SampleMode: true } });
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
    const written = JSON.parse(
      vi.mocked(fs.writeFile).mock.calls[0][1] as string,
    ) as Record<string, unknown>[];

    expect(written).toHaveLength(1);
    const record = written[0];
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('cmdlet', ALLOWLISTED_CMDLETS[0]);
    expect(record).toHaveProperty('parameters');
    expect(record).toHaveProperty('startedAt');
    expect(record).toHaveProperty('endedAt');
    expect(record).toHaveProperty('durationSeconds');
    expect(record).toHaveProperty('outcome');
  });

  it('outcome is "completed" when exit code is 0', async () => {
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    scheduleClose(proc, 0, 15);
    await supertest(buildApp()).post('/run').send({ cmdlet: ALLOWLISTED_CMDLETS[0], parameters: {} });
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const records = JSON.parse(
      vi.mocked(fs.writeFile).mock.calls[0][1] as string,
    ) as { outcome: string }[];
    expect(records[0].outcome).toBe('completed');
  });

  it('outcome is "failed" when exit code is non-zero', async () => {
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    scheduleClose(proc, 1, 15);
    await supertest(buildApp()).post('/run').send({ cmdlet: ALLOWLISTED_CMDLETS[0], parameters: {} });
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const records = JSON.parse(
      vi.mocked(fs.writeFile).mock.calls[0][1] as string,
    ) as { outcome: string }[];
    expect(records[0].outcome).toBe('failed');
  });

  // Direct service call: avoids supertest fire-and-forget timing issues
  it('outcome is "stopped" when killed via stop endpoint', async () => {
    let proc!: FakeProc;
    proc = makeFakeProc(() => { proc._triggerClose(null); }); // kill() → close
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    runCommand(ALLOWLISTED_CMDLETS[0], {}, vi.fn(), vi.fn());
    // activeProcess is set; stopCommand calls proc.kill() which triggers close
    stopCommand();
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
    const records = JSON.parse(
      vi.mocked(fs.writeFile).mock.calls[0][1] as string,
    ) as { outcome: string }[];
    expect(records[0].outcome).toBe('stopped');
  });

  it('caps history at 500 entries (FIFO — drops oldest on 501st entry)', async () => {
    const existingRecords = Array.from({ length: 500 }, (_, i) => ({
      id: `existing-${i}`,
      cmdlet: ALLOWLISTED_CMDLETS[0],
      parameters: {},
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 1,
      outcome: 'completed',
    }));
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify(existingRecords) as unknown as Uint8Array,
    );

    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    scheduleClose(proc, 0, 15);
    await supertest(buildApp()).post('/run').send({ cmdlet: ALLOWLISTED_CMDLETS[0], parameters: {} });
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const records = JSON.parse(
      vi.mocked(fs.writeFile).mock.calls[0][1] as string,
    ) as { id: string }[];
    expect(records).toHaveLength(500);
    expect(records[0].id).toBe('existing-1'); // oldest dropped, existing-1 is now first
  });

  it('history file is written atomically (tmp → rename)', async () => {
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    scheduleClose(proc, 0, 15);
    await supertest(buildApp()).post('/run').send({ cmdlet: ALLOWLISTED_CMDLETS[0], parameters: {} });
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const writePath = String(vi.mocked(fs.writeFile).mock.calls[0][0]);
    const renameSrcPath = String(vi.mocked(fs.rename).mock.calls[0][0]);
    const renameDestPath = String(vi.mocked(fs.rename).mock.calls[0][1]);

    expect(writePath).toMatch(/\.tmp$/);
    expect(renameSrcPath).toMatch(/\.tmp$/);
    expect(renameDestPath).not.toMatch(/\.tmp$/);
    expect(renameSrcPath).toBe(renameDestPath + '.tmp');
  });
});

// ── Stream tests (RUN-03) ────────────────────────────────────────────────
// Content-Type verified via supertest (HTTP header). Event shapes verified via direct
// service calls — supertest does not reliably buffer text/event-stream bodies, and
// the bidirectional timing needed to emit events mid-stream is cleaner at service level.

describe('commands stream (RUN-03)', () => {
  it('POST /run response has Content-Type: text/event-stream', async () => {
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    scheduleClose(proc, 0, 20);
    const res = await supertest(buildApp())
      .post('/run')
      .send({ cmdlet: ALLOWLISTED_CMDLETS[0], parameters: {} });

    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });

  it('SSE events include type and data fields', () => {
    const events: CommandRunEvent[] = [];
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    runCommand(ALLOWLISTED_CMDLETS[0], {}, e => events.push(e), vi.fn());
    proc.stdout.emit('data', Buffer.from('hello\n'));
    proc._triggerClose(0);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('data');
    }
  });

  it('final SSE event has type "exit"', () => {
    const events: CommandRunEvent[] = [];
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    runCommand(ALLOWLISTED_CMDLETS[0], {}, e => events.push(e), vi.fn());
    proc._triggerClose(0);

    const lastEvent = events[events.length - 1];
    expect(lastEvent?.type).toBe('exit');
  });

  it('stderr chunks emitted as type "stderr" events', () => {
    const events: CommandRunEvent[] = [];
    const proc = makeFakeProc();
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc as unknown as ChildProcess);

    runCommand(ALLOWLISTED_CMDLETS[0], {}, e => events.push(e), vi.fn());
    proc.stderr.emit('data', Buffer.from('an error occurred\n'));
    proc._triggerClose(1);

    const stderrEvent = events.find(e => e.type === 'stderr');
    expect(stderrEvent).toBeDefined();
    expect(stderrEvent!.data).toContain('an error occurred');
  });
});

// ── Sanity checks (from Wave 0 — already passing) ────────────────────────

describe('ALLOWLISTED_CMDLETS sanity', () => {
  it('has 13 entries', () => {
    expect(ALLOWLISTED_CMDLETS).toHaveLength(13);
  });
  it('contains Save-EntraOpsPrivilegedEAMJson', () => {
    expect(ALLOWLISTED_CMDLETS).toContain('Save-EntraOpsPrivilegedEAMJson');
  });
  it('contains Update-EntraOps', () => {
    expect(ALLOWLISTED_CMDLETS).toContain('Update-EntraOps');
  });
});
