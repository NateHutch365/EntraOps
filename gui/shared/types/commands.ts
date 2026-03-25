// Allowlisted cmdlets — single source of truth for both client and server
export const ALLOWLISTED_CMDLETS = [
  'Save-EntraOpsPrivilegedEAMJson',
  'Save-EntraOpsWorkloadIdentityInfo',
  'Save-EntraOpsPrivilegedEAMWatchLists',
  'Save-EntraOpsPrivilegedEAMInsightsCustomTable',
  'Save-EntraOpsPrivilegedEAMEnrichmentToWatchLists',
  'Save-EntraOpsWorkloadIdentityEnrichmentWatchLists',
  'Update-EntraOpsPrivilegedAdministrativeUnit',
  'Update-EntraOpsPrivilegedConditionalAccessGroup',
  'Update-EntraOpsPrivilegedUnprotectedAdministrativeUnit',
  'Update-EntraOpsClassificationControlPlaneScope',
  'Update-EntraOpsClassificationFiles',
  'Update-EntraOpsRequiredWorkflowParameters',
  'Update-EntraOps',
] as const;

export type AllowlistedCmdlet = typeof ALLOWLISTED_CMDLETS[number];

// Known RBAC system values — fixed set from CONTEXT.md
export const RBAC_SYSTEMS = ['EntraID', 'ResourceApps', 'IdentityGovernance', 'DeviceManagement', 'Defender'] as const;
export type RbacSystemValue = typeof RBAC_SYSTEMS[number];

// Run outcome states — per CONTEXT.md status badge decisions
export type CommandOutcome = 'completed' | 'failed' | 'stopped';

// Four visual run states as a union — drives badge colour
export type CommandStatus = 'idle' | 'running' | 'completed' | 'failed' | 'stopped';

// Parameters a cmdlet accepts — mirrors CONTEXT.md parameter forms decision
export interface CmdletParameters {
  RbacSystems?: RbacSystemValue[];
  SampleMode?: boolean;
  TenantName?: string;
  SubscriptionId?: string;
  [key: string]: unknown;  // allow future params without breaking
}

// SSE event shape — sent from server POST /api/commands/run stream
export type CommandRunEventType = 'stdout' | 'stderr' | 'exit' | 'error';
export interface CommandRunEvent {
  type: CommandRunEventType;
  data: string;     // stdout/stderr: raw ANSI chunk; exit: exit code string; error: message
}

// POST /api/commands/run request body
export interface RunCommandRequest {
  cmdlet: AllowlistedCmdlet;
  parameters: CmdletParameters;
}

// Run history record — per CONTEXT.md schema exactly
export interface RunHistoryRecord {
  id: string;                     // crypto.randomUUID()
  cmdlet: AllowlistedCmdlet;
  parameters: CmdletParameters;
  startedAt: string;              // ISO 8601
  endedAt: string;                // ISO 8601
  durationSeconds: number;
  outcome: CommandOutcome;
}

// GET /api/commands/history response
export interface CommandHistoryResponse {
  records: RunHistoryRecord[];
}

// GET /api/commands/health response
export interface CommandHealthResponse {
  available: boolean;
  version?: string;   // pwsh version string if available
}
