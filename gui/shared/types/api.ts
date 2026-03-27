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

export interface SuggestedTierCounts {
  ControlPlane: number;
  ManagementPlane: number;
  UserAccess: number;
}

export interface DashboardResponse {
  hasData: boolean;
  tiers: TierCounts;
  objectTypes: Record<string, number>;
  rbacBreakdown: RbacBreakdown[];
  pimTypes: TierPimCounts;
  freshness: string | null;
  recentCommits: GitCommit[];
  suggestedTiers: SuggestedTierCounts;
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

// --- Phase 5: Git Change History types ---

export interface CommitListItem extends GitCommit {
  /** Full 40-char hash for git operations */
  fullHash: string;
  /** RBAC systems that had PrivilegedEAM/ file changes in this commit */
  affectedSystems: RbacSystem[];
  /** Whether this commit touched any PrivilegedEAM/ files */
  hasPrivilegedEAMChanges: boolean;
}

export interface CommitListResponse {
  commits: CommitListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RoleAssignmentDelta {
  action: 'added' | 'removed';
  roleDefinitionName: string;
  tier: EamTier;
}

export interface ObjectChange {
  objectId: string;
  objectDisplayName: string;
  objectType: string;
  changeType: 'added' | 'removed' | 'tierChanged';
  /** Only present for tierChanged */
  previousTier?: EamTier;
  currentTier?: EamTier;
  /** Only present for tierChanged — role assignments that caused the shift */
  roleAssignmentDelta?: RoleAssignmentDelta[];
}

export interface TierSectionChanges {
  tier: 'ControlPlane' | 'ManagementPlane' | 'UserAccess';
  added: ObjectChange[];
  removed: ObjectChange[];
  tierChanged: ObjectChange[];
}

export interface CommitChangeSummary {
  commitHash: string;
  rbacSystem: RbacSystem;
  sections: TierSectionChanges[];
}

export interface ComparisonResult {
  from: GitCommit & { fullHash: string };
  to: GitCommit & { fullHash: string };
  rbacSystem: RbacSystem;
  sections: TierSectionChanges[];
  rawDiff: string;
}
