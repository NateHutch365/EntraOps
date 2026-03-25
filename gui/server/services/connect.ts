import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { CommandRunEvent } from '../../shared/types/commands.js';
import type { ConnectStatus } from '../../shared/types/connect.js';

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');

// Module-scope session state — resets on server restart (session-only per CONTEXT.md decision B)
let connectionState: ConnectStatus = { connected: false, tenantName: null };
let connectProcess: ChildProcess | null = null;

export function getConnectionStatus(): ConnectStatus {
  return { ...connectionState };  // return copy — never expose mutable reference
}

export function isConnecting(): boolean {
  return connectProcess !== null;
}

// runConnect — spawns Connect-EntraOps; sets connectionState on exit code 0
// SECURITY: shell: false mandatory — prevents injection of shell metacharacters
export function runConnect(
  tenantName: string,
  authType: string,
  onEvent: (event: CommandRunEvent) => void,
  onDone: () => void,
): void {
  if (connectProcess !== null) {
    throw Object.assign(new Error('Connection already in progress'), { status: 409 });
  }

  const proc = spawn(
    'pwsh',
    [
      '-NoProfile', '-NonInteractive', '-Command', 'Connect-EntraOps',
      '-TenantName', tenantName,
      '-AuthenticationType', authType,
    ],
    { shell: false, cwd: REPO_ROOT, env: { ...process.env } },
  );
  connectProcess = proc;

  proc.stdout.on('data', (chunk: Buffer) => {
    onEvent({ type: 'stdout', data: chunk.toString() });
  });
  proc.stderr.on('data', (chunk: Buffer) => {
    onEvent({ type: 'stderr', data: chunk.toString() });
  });
  proc.on('close', (code) => {
    if (code === 0) {
      connectionState = { connected: true, tenantName };
    }
    onEvent({ type: 'exit', data: String(code ?? -1) });
    connectProcess = null;
    onDone();
  });
  proc.on('error', (err) => {
    onEvent({ type: 'error', data: err.message });
    connectProcess = null;
    onDone();
  });
}

// disconnectEntraOps — spawns Disconnect-EntraOps; always clears connectionState
export function disconnectEntraOps(
  onEvent: (event: CommandRunEvent) => void,
  onDone: () => void,
): void {
  // Kill any in-progress connect before disconnecting
  if (connectProcess !== null) {
    connectProcess.kill('SIGTERM');
    connectProcess = null;
  }

  const proc = spawn(
    'pwsh',
    ['-NoProfile', '-NonInteractive', '-Command', 'Disconnect-EntraOps'],
    { shell: false, cwd: REPO_ROOT, env: { ...process.env } },
  );

  proc.stdout.on('data', (chunk: Buffer) => {
    onEvent({ type: 'stdout', data: chunk.toString() });
  });
  proc.stderr.on('data', (chunk: Buffer) => {
    onEvent({ type: 'stderr', data: chunk.toString() });
  });
  proc.on('close', (code) => {
    connectionState = { connected: false, tenantName: null };  // always reset, regardless of exit code
    onEvent({ type: 'exit', data: String(code ?? -1) });
    onDone();
  });
  proc.on('error', (err) => {
    connectionState = { connected: false, tenantName: null };  // reset even on spawn error
    onEvent({ type: 'error', data: err.message });
    onDone();
  });
}
