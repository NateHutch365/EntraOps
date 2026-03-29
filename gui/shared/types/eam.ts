export type EamTier = 'ControlPlane' | 'ManagementPlane' | 'UserAccess' | 'Unclassified';
export type RbacSystem = 'EntraID' | 'ResourceApps' | 'IdentityGovernance' | 'DeviceManagement' | 'Defender';
export type ObjectType = 'user' | 'group' | 'serviceprincipal' | 'unknown';
export type PimAssignmentType = 'Permanent' | 'Eligible' | 'NoAssignment';

export interface Classification {
  AdminTierLevel: string;
  AdminTierLevelName: EamTier;
  Service: string;
  TaggedBy: string;
}

export interface RoleAssignment {
  RoleAssignmentId: string;
  RoleAssignmentScopeId: string;
  RoleAssignmentScopeName: string;
  RoleAssignmentType: string;
  RoleAssignmentSubType: string | null;
  PIMManagedRole: boolean | string;
  PIMAssignmentType: PimAssignmentType;
  RoleDefinitionName: string;
  RoleDefinitionId: string;
  RoleType: string;
  RoleIsPrivileged: boolean;
  RoleDefinitionActions: string[];
  Classification: Classification[];
  TransitiveByObjectId: string | null;
  TransitiveByObjectDisplayName: string | null;
}

export interface PrivilegedObject {
  ObjectId: string;
  ObjectType: ObjectType;
  ObjectSubType: string | null;
  ObjectDisplayName: string;
  ObjectUserPrincipalName: string | null;
  ObjectAdminTierLevel: string;
  ObjectAdminTierLevelName: EamTier;
  OnPremSynchronized: boolean | null;
  AssignedAdministrativeUnits: unknown[] | null;
  RestrictedManagementByRAG: boolean | null;
  RestrictedManagementByAadRole: boolean | null;
  RestrictedManagementByRMAU: boolean | null;
  RoleSystem: RbacSystem;
  Classification: Classification[];
  RoleAssignments: RoleAssignment[];
  Sponsors: unknown[] | null;
  Owners: unknown[] | null;
  OwnedObjects: unknown[] | null;
  OwnedDevices: unknown[] | null;
  IdentityParent: unknown | null;
  AssociatedWorkAccount: unknown | null;
  AssociatedPawDevice: unknown | null;
}
