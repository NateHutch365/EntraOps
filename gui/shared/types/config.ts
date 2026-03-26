export type AuthenticationType =
  | 'UserInteractive'
  | 'SystemAssignedMSI'
  | 'UserAssignedMSI'
  | 'FederatedCredentials'
  | 'AlreadyAuthenticated'
  | 'DeviceAuthentication';

export type DevOpsPlatform = 'AzureDevOps' | 'GitHub' | 'None';

export type RbacSystem =
  | 'Azure'
  | 'AzureBilling'
  | 'EntraID'
  | 'IdentityGovernance'
  | 'DeviceManagement'
  | 'ResourceApps'
  | 'Defender';

export interface EntraOpsConfig {
  TenantId: string;
  TenantName: string;
  AuthenticationType: AuthenticationType;
  ClientId: string;
  DevOpsPlatform: DevOpsPlatform;
  RbacSystems: RbacSystem[];
  WorkflowTrigger: {
    PullScheduledTrigger: boolean;
    PullScheduledCron: string;
    PushAfterPullWorkflowTrigger: boolean;
  };
  AutomatedControlPlaneScopeUpdate: {
    ApplyAutomatedControlPlaneScopeUpdate: boolean;
    PrivilegedObjectClassificationSource: string[];
    EntraOpsScopes: string[];
    AzureHighPrivilegedRoles: string[];
    AzureHighPrivilegedScopes: string[];
    ExposureCriticalityLevel: string;
  };
  AutomatedClassificationUpdate: {
    ApplyAutomatedClassificationUpdate: boolean;
    Classifications: string[];
  };
  AutomatedEntraOpsUpdate: {
    ApplyAutomatedEntraOpsUpdate: boolean;
    UpdateScheduledTrigger: boolean;
    UpdateScheduledCron: string;
  };
  LogAnalytics: {
    IngestToLogAnalytics: boolean;
    DataCollectionRuleName: string;
    DataCollectionRuleSubscriptionId: string;
    DataCollectionResourceGroupName: string;
    TableName: string;
  };
  SentinelWatchLists: {
    IngestToWatchLists: boolean;
    WatchListTemplates: string[];
    WatchListWorkloadIdentity: string[];
    SentinelWorkspaceName: string;
    SentinelSubscriptionId: string;
    SentinelResourceGroupName: string;
    WatchListPrefix: string;
  };
  AutomatedAdministrativeUnitManagement: {
    ApplyAdministrativeUnitAssignments: boolean;
    ApplyToAccessTierLevel: string[];
    FilterObjectType: string[];
    RbacSystems: string[];
    RestrictedAuMode: string;
  };
  AutomatedConditionalAccessTargetGroups: {
    ApplyConditionalAccessTargetGroups: boolean;
    AdminUnitName: string;
    ApplyToAccessTierLevel: string[];
    FilterObjectType: string[];
    GroupPrefix: string;
    RbacSystems: string[];
  };
  AutomatedRmauAssignmentsForUnprotectedObjects: {
    ApplyRmauAssignmentsForUnprotectedObjects: boolean;
    ApplyToAccessTierLevel: string[];
    FilterObjectType: string[];
    RbacSystems: string[];
  };
  CustomSecurityAttributes: {
    PrivilegedUserAttribute: string;
    PrivilegedUserPawAttribute: string;
    PrivilegedServicePrincipalAttribute: string;
    UserWorkAccountAttribute: string;
  };
}
