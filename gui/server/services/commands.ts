import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAuthTokens } from './connect.js';
import type {
  AllowlistedCmdlet,
  CmdletParameters,
  CommandOutcome,
  CommandRunEvent,
  RunHistoryRecord,
} from '../../shared/types/commands.js';

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const HISTORY_PATH = path.join(REPO_ROOT, 'gui', '.entraops-run-history.json');
const HISTORY_CAP = 500;

// Module-scope — one active process at a time
let activeProcess: ChildProcess | null = null;
let isStopped = false;

// ── Pwsh health check ──────────────────────────────────────────────────────

export function checkPwshAvailable(): { available: boolean; version?: string } {
  const result = spawnSync('pwsh', ['--version'], { encoding: 'utf-8', timeout: 5000 });
  if (result.error || result.status !== 0) return { available: false };
  return { available: true, version: result.stdout.trim() };
}

// ── Parameter builder (SECURITY: never use shell:true) ────────────────────

// psq — PowerShell single-quote escape for values embedded in -Command strings.
// shell: false prevents OS-level injection; this handles PS-level injection.
function psq(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

// buildPwshArgs — assembles the pwsh argv for a cmdlet invocation.
// Import-Module is required because -NoProfile skips profile scripts that load the module.
// When auth tokens are present (post-connect), we prepend Connect-EntraOps AlreadyAuthenticated
// so the cmdlet process has a live Az + MgGraph session. Connect-EntraOps also sets all
// required globals (DefaultFolderClassification, TenantNameContext, etc.) in the same process.
// Without tokens (e.g. Phase 3 Run Commands), we manually set the folder globals as a fallback.
// SECURITY: all user-supplied string values are PS-single-quote-escaped via psq().
function buildPwshArgs(cmdlet: AllowlistedCmdlet, parameters: CmdletParameters): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined || value === null || value === false) continue;
    if (value === true) {
      parts.push(`-${key}`);
    } else if (Array.isArray(value)) {
      // RbacSystems: from controlled enum — comma-joined, no quoting needed
      parts.push(`-${key}`, (value as string[]).join(','));
    } else {
      // String values: PS-single-quote-escaped to prevent injection
      parts.push(`-${key}`, psq(String(value)));
    }
  }
  const tokens = getAuthTokens();
  let prefix: string;
  if (tokens) {
    // Re-establish auth session from stored tokens — Connect-EntraOps AlreadyAuthenticated
    // also sets DefaultFolderClassification, DefaultFolderClassifiedEam, TenantNameContext globals.
    // -NoWelcome suppresses the splash banner and connection summary from stdout.
    const authInit = [
      `Import-Module './EntraOps/EntraOps.psd1'`,
      `Connect-EntraOps -AuthenticationType 'AlreadyAuthenticated'`,
      `-TenantName ${psq(tokens.tenantName)}`,
      `-AccountId ${psq(tokens.accountId)}`,
      `-AzArmAccessToken ${psq(tokens.azArmToken)}`,
      `-MsGraphAccessToken ${psq(tokens.msGraphToken)}`,
      `-NoWelcome`,
    ].join(' ');
    prefix = authInit;
  } else {
    // No auth session — set folder globals manually so classification path resolution works.
    const initGlobals = [
      `New-Variable -Name DefaultFolderClassification -Value "$EntraOpsBaseFolder/Classification/" -Scope Global -Force`,
      `New-Variable -Name DefaultFolderClassifiedEam -Value "$EntraOpsBaseFolder/PrivilegedEAM/" -Scope Global -Force`,
    ].join('; ');
    prefix = `Import-Module './EntraOps/EntraOps.psd1'; ${initGlobals}`;
  }
  const command = `${prefix}; ${cmdlet}${parts.length ? ' ' + parts.join(' ') : ''}`;
  return ['-NoProfile', '-NonInteractive', '-Command', command];
}

// ── Active process check ──────────────────────────────────────────────────

export function isRunning(): boolean {
  return activeProcess !== null;
}

// ── History helpers ───────────────────────────────────────────────────────

async function readHistory(): Promise<RunHistoryRecord[]> {
  try {
    const raw = await fs.readFile(HISTORY_PATH, 'utf-8');
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendHistory(record: RunHistoryRecord): Promise<void> {
  const existing = await readHistory();
  const updated = [...existing, record].slice(-HISTORY_CAP); // FIFO cap
  const tmp = HISTORY_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(updated, null, 2), 'utf-8');
  await fs.rename(tmp, HISTORY_PATH);
}

export async function getHistory(): Promise<RunHistoryRecord[]> {
  return readHistory();
}

// ── Main run function ─────────────────────────────────────────────────────
// onEvent: called with each SSE event to send to the client
// onDone: called when process exits (to end the SSE stream)

export function runCommand(
  cmdlet: AllowlistedCmdlet,
  parameters: CmdletParameters,
  onEvent: (event: CommandRunEvent) => void,
  onDone: () => void,
): string {
  if (activeProcess !== null) {
    throw Object.assign(new Error('A command is already running'), { status: 409 });
  }

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  isStopped = false;

  const args = buildPwshArgs(cmdlet, parameters);

  // SECURITY: shell: false is mandatory — prevents injection of shell metacharacters
  // cwd: REPO_ROOT — cmdlets need module context from the repo root
  const proc = spawn('pwsh', args, {
    shell: false,
    cwd: REPO_ROOT,
    env: { ...process.env },
  });
  activeProcess = proc;

  proc.stdout.on('data', (chunk: Buffer) => {
    onEvent({ type: 'stdout', data: chunk.toString() });
  });

  proc.stderr.on('data', (chunk: Buffer) => {
    onEvent({ type: 'stderr', data: chunk.toString() });
  });

  proc.on('close', async (code) => {
    const outcome: CommandOutcome = isStopped
      ? 'stopped'
      : code === 0
        ? 'completed'
        : 'failed';

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    );

    onEvent({ type: 'exit', data: String(code ?? -1) });

    const record: RunHistoryRecord = {
      id: runId,
      cmdlet,
      parameters,
      startedAt,
      endedAt,
      durationSeconds,
      outcome,
    };

    // Write history async — do not block stream close
    appendHistory(record).catch((err) => {
      console.error('Failed to write run history:', err);
    });

    // Clear active state AFTER writing history
    activeProcess = null;
    isStopped = false;
    onDone();
  });

  proc.on('error', (err) => {
    onEvent({ type: 'error', data: err.message });
    activeProcess = null;
    isStopped = false;
    onDone();
  });

  return runId;
}

// ── Stop function ─────────────────────────────────────────────────────────
// Sets the module-level isStopped flag so the close handler records the correct outcome.
// Returns a formatted time string injected into the SSE stream as a stopped message.

export function stopCommand(): string | null {
  if (!activeProcess) return null;
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
  // Mark as stopped BEFORE kill so the close handler sees the flag
  isStopped = true;
  activeProcess.kill();
  return timeStr;
}
