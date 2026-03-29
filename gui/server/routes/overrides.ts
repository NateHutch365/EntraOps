import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { assertSafePath } from '../middleware/security.js';
import { atomicWrite } from '../utils/atomicWrite.js';
import type { Override } from '../../shared/types/api.js';

const router = Router();

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const CLASSIFICATION_BASE = path.join(REPO_ROOT, 'Classification');
const safeClassificationPath = assertSafePath(CLASSIFICATION_BASE);

const OverrideSchema = z.object({
  ObjectId: z.string().min(1),
  OverrideTierLevelName: z.enum(['ControlPlane', 'ManagementPlane', 'UserAccess']),
});

const OverridesBodySchema = z.object({
  overrides: z.array(OverrideSchema),
});

router.get('/', async (_req, res, next) => {
  try {
    let overrides: Override[] = [];
    try {
      const filePath = safeClassificationPath('Overrides.json');
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = z.array(OverrideSchema).safeParse(JSON.parse(raw));
      if (parsed.success) overrides = parsed.data;
    } catch {
      // File missing or invalid JSON — return empty array, no error
    }
    res.json({ overrides });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = OverridesBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await fs.mkdir(CLASSIFICATION_BASE, { recursive: true });
    const filePath = safeClassificationPath('Overrides.json');
    await atomicWrite(filePath, JSON.stringify(parsed.data.overrides, null, 2));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as overridesRouter };
