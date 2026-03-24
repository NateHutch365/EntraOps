import type { PrivilegedObject, EamTier, RbacSystem } from './eam.js';

export type { PrivilegedObject, EamTier, RbacSystem };

export interface TierCounts {
  ControlPlane: number;
  ManagementPlane: number;
  UserAccess: number;
  Unclassified: number;
}

export interface TierPimCounts {
  ControlPlane: { Permanent: number; Eligible: number };
  ManagementPlane: { Permanent: number; Eligible: number };
  UserAccess: { Permanent: number; Eligible: number };
}

export interface RbacBreakdown {
  tier: EamTier;
  EntraID: number;
  ResourceApps: number;
  IdentityGovernance: number;
  DeviceManagement: number;
  Defender: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface DashboardResponse {
  hasData: boolean;
  tiers: TierCounts;
  objectTypes: Record<string, number>;
  rbacBreakdown: RbacBreakdown[];
  pimTypes: TierPimCounts;
  freshness: string | null;
  recentCommits: GitCommit[];
}

export interface ObjectsQuery {
  tier?: string[];
  rbac?: string[];
  type?: string[];
  pim?: string[];
  onprem?: string[];
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ObjectsResponse {
  objects: PrivilegedObject[];
  total: number;
  page: number;
  pageSize: number;
}
