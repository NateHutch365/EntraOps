import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { atomicWrite } from '../utils/atomicWrite.js';

const router = Router();

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const CONFIG_PATH = path.join(REPO_ROOT, 'EntraOpsConfig.json');

function parseBomJson(raw: string): unknown {
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

// Zod v4 schema — use error: (not message:) for custom error strings (Zod v4 breaking change)
const AuthTypeEnum = z.enum([
  'UserInteractive',
  'SystemAssignedMSI',
  'UserAssignedMSI',
  'FederatedCredentials',
  'AlreadyAuthenticated',
  'DeviceAuthentication',
]);
const DevOpsPlatformEnum = z.enum(['AzureDevOps', 'GitHub', 'None']);
const RbacSystemEnum = z.enum([
  'Azure',
  'AzureBilling',
  'EntraID',
  'IdentityGovernance',
  'DeviceManagement',
  'ResourceApps',
  'Defender',
]);

export const EntraOpsConfigSchema = z.object({
  TenantId: z.string(),
  TenantName: z.string(),
  AuthenticationType: AuthTypeEnum,
  ClientId: z.string(),
  DevOpsPlatform: DevOpsPlatformEnum,
  RbacSystems: z.array(RbacSystemEnum),
  WorkflowTrigger: z.object({
    PullScheduledTrigger: z.boolean(),
    PullScheduledCron: z.string(),
    PushAfterPullWorkflowTrigger: z.boolean(),
  }),
  AutomatedControlPlaneScopeUpdate: z.object({
    ApplyAutomatedControlPlaneScopeUpdate: z.boolean(),
    PrivilegedObjectClassificationSource: z.array(z.string()),
    EntraOpsScopes: z.array(z.string()),
    AzureHighPrivilegedRoles: z.array(z.string()),
    AzureHighPrivilegedScopes: z.array(z.string()),
    ExposureCriticalityLevel: z.string(),
  }),
  AutomatedClassificationUpdate: z.object({
    ApplyAutomatedClassificationUpdate: z.boolean(),
    Classifications: z.array(z.string()),
  }),
  AutomatedEntraOpsUpdate: z.object({
    ApplyAutomatedEntraOpsUpdate: z.boolean(),
    UpdateScheduledTrigger: z.boolean(),
    UpdateScheduledCron: z.string(),
  }),
  LogAnalytics: z.object({
    IngestToLogAnalytics: z.boolean(),
    DataCollectionRuleName: z.string(),
    DataCollectionRuleSubscriptionId: z.string(),
    DataCollectionResourceGroupName: z.string(),
    TableName: z.string(),
  }),
  SentinelWatchLists: z.object({
    IngestToWatchLists: z.boolean(),
    WatchListTemplates: z.array(z.string()),
    WatchListWorkloadIdentity: z.array(z.string()),
    SentinelWorkspaceName: z.string(),
    SentinelSubscriptionId: z.string(),
    SentinelResourceGroupName: z.string(),
    WatchListPrefix: z.string(),
  }),
  AutomatedAdministrativeUnitManagement: z.object({
    ApplyAdministrativeUnitAssignments: z.boolean(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    RbacSystems: z.array(z.string()),
    RestrictedAuMode: z.string(),
  }),
  AutomatedConditionalAccessTargetGroups: z.object({
    ApplyConditionalAccessTargetGroups: z.boolean(),
    AdminUnitName: z.string(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    GroupPrefix: z.string(),
    RbacSystems: z.array(z.string()),
  }),
  AutomatedRmauAssignmentsForUnprotectedObjects: z.object({
    ApplyRmauAssignmentsForUnprotectedObjects: z.boolean(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    RbacSystems: z.array(z.string()),
  }),
  CustomSecurityAttributes: z.object({
    PrivilegedUserAttribute: z.string(),
    PrivilegedUserPawAttribute: z.string(),
    PrivilegedServicePrincipalAttribute: z.string(),
    UserWorkAccountAttribute: z.string(),
  }),
});

// GET /api/config — returns parsed EntraOpsConfig.json or {} if missing/unreadable
router.get('/', async (_req, res, next) => {
  try {
    try {
      const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
      res.json(parseBomJson(raw));
    } catch {
      // File missing or unreadable — return empty config, not 404
      // Consistent with GET /api/templates/global empty-state pattern
      res.json({});
    }
  } catch (err) {
    next(err);
  }
});

// PUT /api/config — validates with Zod and writes atomically to EntraOpsConfig.json
router.put('/', async (req, res, next) => {
  try {
    const result = EntraOpsConfigSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ error: result.error.issues });
      return;
    }
    const content = JSON.stringify(result.data, null, 2);
    await atomicWrite(CONFIG_PATH, content);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as configRouter };
