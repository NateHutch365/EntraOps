import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';

const router = Router();

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const CONFIG_PATH = path.join(REPO_ROOT, 'EntraOpsConfig.json');

function parseBomJson(raw: string): unknown {
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

// GET /api/config — returns parsed EntraOpsConfig.json or {} if missing/unreadable
// Used by RunCommandsPage to pre-populate TenantName, SubscriptionId, etc.
// Phase 5 (Settings) will replace this with a full read/write settings router.
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

export { router as configRouter };
