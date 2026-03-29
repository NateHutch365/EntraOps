import { Router } from 'express';
import { z } from 'zod';
import { getRecentPrivilegedEAMCommits } from '../services/gitLog.js';
import {
  getPaginatedCommits,
  getCommitChangeSummary,
  getCommitComparison,
  getAffectedSystems,
} from '../services/gitHistory.js';
import type { RbacSystem } from '../../shared/types/eam.js';

const router = Router();

// Inline coerce helper (same pattern as objects.ts — not imported cross-route)
const coerceArray = z.preprocess(
  (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.string()),
);

// --------------------------------------------------------------------------
// Existing route
// --------------------------------------------------------------------------

// GET /api/git/recent — last 5 commits touching PrivilegedEAM/
// gitLog service returns [] (not throws) if git unavailable
router.get('/recent', async (_req, res) => {
  const commits = await getRecentPrivilegedEAMCommits(5);
  res.json({ commits });
});

// --------------------------------------------------------------------------
// Phase 5 routes — HIST-01 through HIST-04
// --------------------------------------------------------------------------

// NOTE: /compare is defined before /:hash routes to avoid Express param capture

// GET /api/git/compare?from=X&to=Y&rbac=Z — two-commit comparison (HIST-04)
const CompareQuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  rbac: z.string().min(1),
});

router.get('/compare', async (req, res) => {
  const parsed = CompareQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const result = await getCommitComparison(
    parsed.data.from,
    parsed.data.to,
    parsed.data.rbac as RbacSystem,
  );
  res.json(result);
});

// GET /api/git/commits?page=1&pageSize=20 — paginated commit list (HIST-01)
const CommitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/commits', async (req, res) => {
  const parsed = CommitsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { page, pageSize } = parsed.data;
  const result = await getPaginatedCommits(page, pageSize);
  res.json(result);
});

// GET /api/git/commits/:hash/systems — RBAC systems affected by commit
router.get('/commits/:hash/systems', async (req, res) => {
  const systems = await getAffectedSystems(req.params.hash);
  res.json({ systems });
});

// GET /api/git/commits/:hash/changes?rbac=EntraID — structured change summary (HIST-02, HIST-03)
const ChangesQuerySchema = z.object({
  rbac: z.string().min(1),
});

router.get('/commits/:hash/changes', async (req, res) => {
  const parsed = ChangesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const summary = await getCommitChangeSummary(
    req.params.hash,
    parsed.data.rbac as RbacSystem,
  );
  res.json(summary);
});

export { router as gitRouter };
