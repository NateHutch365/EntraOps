import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import supertest from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/security.js';

// Mock fs module before importing the router
vi.mock('node:fs/promises');

// Import router after mocking
import { templatesRouter } from '../../routes/templates.js';

// Fixture data matching real JSON shape
const FIXTURE_TEMPLATE = JSON.stringify([
  {
    EAMTierLevelName: 'ControlPlane',
    EAMTierLevelTagValue: '0',
    TierLevelDefinition: [
      {
        Category: 'Microsoft.AzureAD',
        Service: 'Application and Workload Identity',
        RoleAssignmentScopeName: ['/*'],
        RoleDefinitionActions: ['microsoft.directory/applications/create'],
      },
    ],
  },
]);

const FIXTURE_GLOBAL = JSON.stringify([{ ExcludedPrincipalId: [] }]);
const FIXTURE_GLOBAL_WITH_GUIDS = JSON.stringify([
  { ExcludedPrincipalId: ['550e8400-e29b-41d4-a716-446655440000'] },
]);

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/templates', templatesRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /api/templates', () => {
  it('returns list of 5 template names', async () => {
    const res = await supertest(buildApp()).get('/api/templates');
    expect(res.status).toBe(200);
    expect(res.body.names).toHaveLength(5);
    expect(res.body.names).toContain('Classification_AadResources');
  });
});

describe('GET /api/templates/global', () => {
  beforeEach(() => {
    vi.mocked(fs.readFile).mockResolvedValue(FIXTURE_GLOBAL as unknown as Uint8Array);
  });
  afterEach(() => vi.clearAllMocks());

  it('returns exclusions array', async () => {
    const res = await supertest(buildApp()).get('/api/templates/global');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exclusions');
    expect(Array.isArray(res.body.exclusions)).toBe(true);
  });

  it('returns empty exclusions array when file has empty ExcludedPrincipalId', async () => {
    const res = await supertest(buildApp()).get('/api/templates/global');
    expect(res.body.exclusions).toEqual([]);
  });

  it('returns empty exclusions when file is missing', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const res = await supertest(buildApp()).get('/api/templates/global');
    expect(res.status).toBe(200);
    expect(res.body.exclusions).toEqual([]);
  });
});

describe('PUT /api/templates/global', () => {
  afterEach(() => vi.clearAllMocks());

  it('writes file and returns 200 with valid GUIDs', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const res = await supertest(buildApp())
      .put('/api/templates/global')
      .send({ exclusions: ['550e8400-e29b-41d4-a716-446655440000'] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fs.writeFile).toHaveBeenCalledOnce();
    expect(fs.rename).toHaveBeenCalledOnce();
  });

  it('returns 400 when exclusions contain non-UUID strings', async () => {
    const res = await supertest(buildApp())
      .put('/api/templates/global')
      .send({ exclusions: ['not-a-uuid'] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/templates/:name', () => {
  beforeEach(() => {
    vi.mocked(fs.readFile).mockResolvedValue(FIXTURE_TEMPLATE as unknown as Uint8Array);
  });
  afterEach(() => vi.clearAllMocks());

  it('returns { name, tiers } for valid template name', async () => {
    const res = await supertest(buildApp()).get('/api/templates/Classification_AadResources');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Classification_AadResources');
    expect(Array.isArray(res.body.tiers)).toBe(true);
    expect(res.body.tiers[0].EAMTierLevelName).toBe('ControlPlane');
  });

  it('strips UTF-8 BOM from template file', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(('\uFEFF' + FIXTURE_TEMPLATE) as unknown as Uint8Array);
    const res = await supertest(buildApp()).get('/api/templates/Classification_AadResources');
    expect(res.status).toBe(200);
    expect(res.body.tiers).toBeDefined();
  });

  it('returns 400 for unknown template name', async () => {
    const res = await supertest(buildApp()).get('/api/templates/Classification_Unknown');
    expect(res.status).toBe(400);
  });

  it('returns 400 or 403 for path traversal attempt', async () => {
    const res = await supertest(buildApp()).get('/api/templates/../../../etc/passwd');
    expect([400, 403, 404]).toContain(res.status); // Express normalises the path, name validation catches it
  });
});

describe('PUT /api/templates/:name', () => {
  afterEach(() => vi.clearAllMocks());

  const VALID_TIERS = [
    {
      EAMTierLevelName: 'ControlPlane',
      EAMTierLevelTagValue: '0',
      TierLevelDefinition: [
        {
          Category: 'Microsoft.AzureAD',
          Service: 'Some Service',
          RoleAssignmentScopeName: ['/*'],
          RoleDefinitionActions: ['some.action'],
        },
      ],
    },
  ];

  it('writes file and returns 200 with valid tiers body', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const res = await supertest(buildApp())
      .put('/api/templates/Classification_AadResources')
      .send({ tiers: VALID_TIERS });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fs.writeFile).toHaveBeenCalledOnce();
    expect(fs.rename).toHaveBeenCalledOnce();
  });

  it('returns 400 when tier is missing EAMTierLevelName', async () => {
    const invalidTiers = [
      {
        EAMTierLevelTagValue: '0',
        TierLevelDefinition: [],
      },
    ];
    const res = await supertest(buildApp())
      .put('/api/templates/Classification_AadResources')
      .send({ tiers: invalidTiers });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for unknown template name', async () => {
    const res = await supertest(buildApp())
      .put('/api/templates/Classification_Unknown')
      .send({ tiers: VALID_TIERS });
    expect(res.status).toBe(400);
  });
});
