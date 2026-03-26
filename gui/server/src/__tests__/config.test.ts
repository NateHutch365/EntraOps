import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import supertest from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/security.js';

// Mock fs module before importing the router
vi.mock('node:fs/promises');

// Import router after mocking
import { configRouter } from '../../routes/config.js';

// Minimal valid config fixture matching the full EntraOpsConfigSchema
const FIXTURE_CONFIG = JSON.stringify({
  TenantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  TenantName: 'contoso.onmicrosoft.com',
  AuthenticationType: 'UserInteractive',
  ClientId: 'ffffffff-aaaa-bbbb-cccc-dddddddddddd',
  DevOpsPlatform: 'GitHub',
  RbacSystems: ['EntraID', 'ResourceApps'],
  WorkflowTrigger: {
    PullScheduledTrigger: true,
    PullScheduledCron: '30 9 * * *',
    PushAfterPullWorkflowTrigger: true,
  },
  AutomatedControlPlaneScopeUpdate: {
    ApplyAutomatedControlPlaneScopeUpdate: false,
    PrivilegedObjectClassificationSource: ['EntraOps'],
    EntraOpsScopes: ['EntraID'],
    AzureHighPrivilegedRoles: ['Owner'],
    AzureHighPrivilegedScopes: ['/'],
    ExposureCriticalityLevel: '<1',
  },
  AutomatedClassificationUpdate: {
    ApplyAutomatedClassificationUpdate: false,
    Classifications: ['AadResources'],
  },
  AutomatedEntraOpsUpdate: {
    ApplyAutomatedEntraOpsUpdate: false,
    UpdateScheduledTrigger: true,
    UpdateScheduledCron: '0 9 * * 3',
  },
  LogAnalytics: {
    IngestToLogAnalytics: false,
    DataCollectionRuleName: 'my-dcr',
    DataCollectionRuleSubscriptionId: '11111111-2222-3333-4444-555555555555',
    DataCollectionResourceGroupName: 'my-rg',
    TableName: 'PrivilegedEAM_CL',
  },
  SentinelWatchLists: {
    IngestToWatchLists: false,
    WatchListTemplates: [],
    WatchListWorkloadIdentity: [],
    SentinelWorkspaceName: 'my-workspace',
    SentinelSubscriptionId: '11111111-2222-3333-4444-666666666666',
    SentinelResourceGroupName: 'my-sentinel-rg',
    WatchListPrefix: 'EntraOps_',
  },
  AutomatedAdministrativeUnitManagement: {
    ApplyAdministrativeUnitAssignments: false,
    ApplyToAccessTierLevel: ['ControlPlane'],
    FilterObjectType: ['User'],
    RbacSystems: ['EntraID'],
    RestrictedAuMode: 'selected',
  },
  AutomatedConditionalAccessTargetGroups: {
    ApplyConditionalAccessTargetGroups: false,
    AdminUnitName: 'Tier0-ControlPlane.ConditionalAccess',
    ApplyToAccessTierLevel: ['ControlPlane'],
    FilterObjectType: ['User'],
    GroupPrefix: 'sug_Entra.CA.',
    RbacSystems: ['EntraID'],
  },
  AutomatedRmauAssignmentsForUnprotectedObjects: {
    ApplyRmauAssignmentsForUnprotectedObjects: false,
    ApplyToAccessTierLevel: ['ControlPlane'],
    FilterObjectType: ['User'],
    RbacSystems: ['EntraID'],
  },
  CustomSecurityAttributes: {
    PrivilegedUserAttribute: 'privilegedUser',
    PrivilegedUserPawAttribute: 'associatedSecureAdminWorkstation',
    PrivilegedServicePrincipalAttribute: 'privilegedWorkloadIdentitiy',
    UserWorkAccountAttribute: 'associatedWorkAccount',
  },
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/config', configRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /api/config', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns {} when config file is missing', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    const res = await supertest(buildApp()).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it('returns parsed JSON when config file exists', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(FIXTURE_CONFIG as unknown as Uint8Array);
    const res = await supertest(buildApp()).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.TenantId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.body.TenantName).toBe('contoso.onmicrosoft.com');
  });

  it('strips UTF-8 BOM from config file', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(
      ('\uFEFF' + FIXTURE_CONFIG) as unknown as Uint8Array,
    );
    const res = await supertest(buildApp()).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.TenantId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });
});

describe('PUT /api/config', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns { ok: true } and calls writeFile + rename with valid body', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const res = await supertest(buildApp())
      .put('/api/config')
      .send(JSON.parse(FIXTURE_CONFIG));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fs.writeFile).toHaveBeenCalledOnce();
    expect(fs.rename).toHaveBeenCalledOnce();
  });

  it('returns 422 when a required top-level field has wrong type', async () => {
    const body = { ...JSON.parse(FIXTURE_CONFIG), TenantId: 123 };
    const res = await supertest(buildApp()).put('/api/config').send(body);
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
    expect(Array.isArray(res.body.error)).toBe(true);
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await supertest(buildApp())
      .put('/api/config')
      .send({ TenantId: 'only-this-field' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
    expect(Array.isArray(res.body.error)).toBe(true);
  });

  it('returns 422 when AuthenticationType is not a valid enum value', async () => {
    const body = { ...JSON.parse(FIXTURE_CONFIG), AuthenticationType: 'InvalidAuthType' };
    const res = await supertest(buildApp()).put('/api/config').send(body);
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 422 when RbacSystems contains an invalid enum value', async () => {
    const body = { ...JSON.parse(FIXTURE_CONFIG), RbacSystems: ['EntraID', 'NotARbacSystem'] };
    const res = await supertest(buildApp()).put('/api/config').send(body);
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
  });
});
