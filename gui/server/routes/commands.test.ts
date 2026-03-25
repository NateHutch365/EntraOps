import { describe, it, expect } from 'vitest';
import { ALLOWLISTED_CMDLETS } from '../../shared/types/commands.js';

// These tests are stubs — they will be fleshed out when the route is implemented in Plan 02.
// They exist now so the executor has a clear testing contract to satisfy.

describe('commands allowlist (RUN-04)', () => {
  it.todo('rejects cmdlet not in ALLOWLISTED_CMDLETS with 400');
  it.todo('accepts every cmdlet in ALLOWLISTED_CMDLETS without throwing');
  it.todo('ALLOWLISTED_CMDLETS does not contain Invoke-EntraOpsAzGraphQuery');
  it.todo('ALLOWLISTED_CMDLETS does not contain Invoke-EntraOpsMsGraphQuery');
  it.todo('ALLOWLISTED_CMDLETS does not contain Invoke-EntraOpsGraphSecurityQuery');
});

describe('commands concurrency (RUN-05)', () => {
  it.todo('returns 409 when a process is already running');
  it.todo('allows run after previous process exited');
});

describe('commands history (RUN-06)', () => {
  it.todo('writes a RunHistoryRecord on completion with all required fields (id, cmdlet, parameters, startedAt, endedAt, durationSeconds, outcome)');
  it.todo('outcome is "completed" when exit code is 0');
  it.todo('outcome is "failed" when exit code is non-zero');
  it.todo('outcome is "stopped" when killed via stop endpoint');
  it.todo('caps history at 500 entries (FIFO — drops oldest on 501st entry)');
  it.todo('history file is written atomically (tmp → rename)');
});

describe('commands stream (RUN-03)', () => {
  it.todo('POST /run response has Content-Type: text/event-stream');
  it.todo('SSE events include type and data fields');
  it.todo('final SSE event has type "exit"');
  it.todo('stderr chunks emitted as type "stderr" events');
});

// Sanity check — runs immediately to verify the allowlist constant is accessible
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
