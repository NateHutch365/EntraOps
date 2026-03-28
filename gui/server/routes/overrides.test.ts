import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { errorHandler } from '../middleware/security.js';

// Mock fs/promises so tests don't touch the real filesystem
vi.mock('node:fs/promises');

import * as fs from 'node:fs/promises';

// THIS IMPORT FAILS UNTIL Plan 02 creates overrides.ts — intentional RED state
import { overridesRouter } from './overrides.js';

const app = express();
app.use(express.json());
app.use('/api/overrides', overridesRouter);
app.use(errorHandler);

describe('GET /api/overrides', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns { overrides: [] } when Overrides.json is missing', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(
      Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' }),
    );
    const res = await supertest(app).get('/api/overrides');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ overrides: [] });
  });

  it('returns parsed overrides when Overrides.json exists and is valid', async () => {
    const stored = [
      { ObjectId: 'aaaa-1111-bbbb-2222', OverrideTierLevelName: 'ControlPlane' },
    ];
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(stored) as unknown as Buffer);
    const res = await supertest(app).get('/api/overrides');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ overrides: stored });
  });

  it('returns { overrides: [] } when Overrides.json contains invalid JSON', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('not valid json' as unknown as Buffer);
    const res = await supertest(app).get('/api/overrides');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ overrides: [] });
  });
});

describe('POST /api/overrides', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as unknown as string);
    vi.mocked(fs.writeFile).mockResolvedValue();
    vi.mocked(fs.rename).mockResolvedValue();
  });

  it('returns { ok: true } and writes atomically on valid payload', async () => {
    const payload = {
      overrides: [
        { ObjectId: 'aaaa-bbbb-cccc-dddd', OverrideTierLevelName: 'ManagementPlane' },
      ],
    };
    const res = await supertest(app).post('/api/overrides').send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    // atomicWrite uses writeFile(tmp) then rename(tmp, final)
    expect(vi.mocked(fs.writeFile)).toHaveBeenCalledOnce();
    expect(vi.mocked(fs.rename)).toHaveBeenCalledOnce();
  });

  it('accepts empty overrides array (discard all overrides)', async () => {
    const res = await supertest(app).post('/api/overrides').send({ overrides: [] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 400 when OverrideTierLevelName is invalid', async () => {
    const payload = {
      overrides: [{ ObjectId: 'test-id', OverrideTierLevelName: 'InvalidTier' }],
    };
    const res = await supertest(app).post('/api/overrides').send(payload);
    expect(res.status).toBe(400);
  });

  it('returns 400 when overrides field is missing', async () => {
    const res = await supertest(app).post('/api/overrides').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when overrides is not an array', async () => {
    const res = await supertest(app).post('/api/overrides').send({ overrides: 'not-array' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when ObjectId is empty string', async () => {
    const payload = { overrides: [{ ObjectId: '', OverrideTierLevelName: 'UserAccess' }] };
    const res = await supertest(app).post('/api/overrides').send(payload);
    expect(res.status).toBe(400);
  });
});
