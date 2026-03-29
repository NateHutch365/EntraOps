// Auth types — allowed values for authType in ConnectRequest
export const AUTH_TYPES = ['DeviceAuthentication', 'UserInteractive'] as const;
export type AuthType = typeof AUTH_TYPES[number];

// POST /api/connect/start request body
export interface ConnectRequest {
  tenantName: string;    // required, non-empty — validated server-side with z.string().min(1)
  authType: AuthType;    // default: 'DeviceAuthentication'
}

// GET /api/connect/status response + internal session state shape
export interface ConnectStatus {
  connected: boolean;
  tenantName: string | null;
}
