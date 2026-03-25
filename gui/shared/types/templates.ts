export type TemplateName =
  | 'Classification_AadResources'
  | 'Classification_AppRoles'
  | 'Classification_Defender'
  | 'Classification_DeviceManagement'
  | 'Classification_IdentityGovernance';

export const TEMPLATE_NAMES: TemplateName[] = [
  'Classification_AadResources',
  'Classification_AppRoles',
  'Classification_Defender',
  'Classification_DeviceManagement',
  'Classification_IdentityGovernance',
];

export interface TierLevelDefinitionEntry {
  Category: string;
  Service: string;
  RoleAssignmentScopeName: string[];
  RoleDefinitionActions: string[];
}

export interface TierBlock {
  EAMTierLevelName: 'ControlPlane' | 'ManagementPlane' | 'UserAccess';
  EAMTierLevelTagValue: string;
  TierLevelDefinition: TierLevelDefinitionEntry[];
}

export interface GlobalExclusion {
  ExcludedPrincipalId: string[];
}

export interface GetTemplateResponse {
  name: TemplateName;
  tiers: TierBlock[];
}

export interface GetGlobalResponse {
  exclusions: string[];
}
