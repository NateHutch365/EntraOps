import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { CommandRunEvent } from '../../shared/types/commands.js';
import type { ConnectStatus } from '../../shared/types/connect.js';

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');

// Module-scope session state — resets on server restart (session-only per CONTEXT.md decision B)
let connectionState: ConnectStatus = { connected: false, tenantName: null };
let connectProcess: ChildProcess | null = null;

// Auth tokens extracted after successful Connect-EntraOps — held in memory for classify reuse.
// SECURITY: JWTs, never logged or persisted to disk, cleared on disconnect/server restart.
interface AuthTokens {
  accountId: string;
  azArmToken: string;
  msGraphToken: string;
  tenantName: string;
}
let authTokens: AuthTokens | null = null;

export function getConnectionStatus(): ConnectStatus {
  return { ...connectionState };  // return copy — never expose mutable reference
}

export function getAuthTokens(): AuthTokens | null {
  return authTokens;
}

export function isConnecting(): boolean {
  return connectProcess !== null;
}

// psq — PowerShell single-quote escape. Values embedded in -Command strings must
// use single-quoted PS strings with doubled-single-quote escaping to prevent injection.
// shell: false prevents OS-level injection; this handles PS-level injection.
function psq(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

// extractTokens — after successful Connect-EntraOps, extract Az + MgGraph access tokens
// via spawnSync so classify processes can re-establish auth without requiring the user
// to authenticate again. Called after onDone() so the SSE stream closes first.
// ctps() handles both SecureString (Az 3.x) and plain string (Az 2.x) token formats.
function extractTokens(tenantName: string): void {
  const script = [
    "Import-Module './EntraOps/EntraOps.psd1'",
    "function ctps($s) { if ($s -is [securestring]) { [System.Net.NetworkCredential]::new('', $s).Password } else { [string]$s } }",
    '$ctx = Get-AzContext',
    '$armToken = ctps (Get-AzAccessToken -ResourceTypeName ARM).Token',
    '$graphToken = ctps (Get-AzAccessToken -ResourceTypeName MSGraph).Token',
    '[PSCustomObject]@{ AccountId = $ctx.Account.Id; AzArmToken = $armToken; MsGraphToken = $graphToken } | ConvertTo-Json -Compress',
  ].join('; ');

  const result = spawnSync(
    'pwsh',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { shell: false, cwd: REPO_ROOT, encoding: 'utf-8', timeout: 30000 },
  );

  if (result.status !== 0 || result.error) {
    console.error('[connect] token extraction failed:', result.stderr?.slice(0, 500) ?? result.error?.message);
    return;
  }

  try {
    // Find the JSON output line — module import may produce other stdout lines
    const jsonLine = result.stdout.split('\n').find(l => l.trim().startsWith('{')) ?? '';
    const parsed = JSON.parse(jsonLine) as { AccountId: string; AzArmToken: string; MsGraphToken: string };
    if (parsed.AccountId && parsed.AzArmToken && parsed.MsGraphToken) {
      authTokens = { accountId: parsed.AccountId, azArmToken: parsed.AzArmToken, msGraphToken: parsed.MsGraphToken, tenantName };
    } else {
      console.error('[connect] token extraction returned incomplete data');
    }
  } catch (err) {
    console.error('[connect] token extraction JSON parse failed:', err);
  }
}

// runConnect — spawns Connect-EntraOps; sets connectionState on exit code 0
// then extracts auth tokens (after SSE stream closes) so classify processes can reuse them.
// SECURITY: shell: false mandatory — prevents injection of shell metacharacters.
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
      '-NoProfile', '-NonInteractive', '-Command',
      `Import-Module './EntraOps/EntraOps.psd1'; Connect-EntraOps -TenantName ${psq(tenantName)} -AuthenticationType ${psq(authType)}`,
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
    onDone();  // close SSE stream first, then extract tokens synchronously
    if (code === 0) {
      extractTokens(tenantName);
    }
  });
  proc.on('error', (err) => {
    onEvent({ type: 'error', data: err.message });
    connectProcess = null;
    onDone();
  });
}

// disconnectEntraOps — spawns Disconnect-EntraOps; always clears connectionState and authTokens
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
    ['-NoProfile', '-NonInteractive', '-Command', "Import-Module './EntraOps/EntraOps.psd1'; Disconnect-EntraOps"],
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
    authTokens = null;
    onEvent({ type: 'exit', data: String(code ?? -1) });
    onDone();
  });
  proc.on('error', (err) => {
    connectionState = { connected: false, tenantName: null };  // reset even on spawn error
    authTokens = null;
    onEvent({ type: 'error', data: err.message });
    onDone();
  });
}
