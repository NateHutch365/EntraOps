import { Router } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { readEamJson } from '../services/eamReader.js';
import type { PrivilegedObject, RbacSystem } from '../../shared/types/eam.js';

const router = Router();

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const EAM_BASE = path.join(REPO_ROOT, 'PrivilegedEAM');
const RBAC_SYSTEMS: RbacSystem[] = [
  'EntraID',
  'ResourceApps',
  'IdentityGovernance',
  'DeviceManagement',
  'Defender',
];

// Express may parse repeated params as string | string[] — normalize to string[]
const coerceArray = z.preprocess(
  (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.string())
);

// Zod v4 schema — uses error: (not message:) for custom error strings
const QuerySchema = z.object({
  tier:     coerceArray.optional(),
  rbac:     coerceArray.optional(),
  type:     coerceArray.optional(),
  pim:      coerceArray.optional(),
  onprem:   coerceArray.optional(),
  q:        z.string().optional(),
  page:     z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy:   z.string().default('ObjectAdminTierLevel'),
  sortDir:  z.enum(['asc', 'desc']).default('asc'),
});

async function loadAllObjects(): Promise<PrivilegedObject[]> {
  const all: PrivilegedObject[] = [];
  for (const system of RBAC_SYSTEMS) {
    try {
      const file = path.join(EAM_BASE, system, `${system}.json`);
      const objects = await readEamJson(file) as PrivilegedObject[];
      if (Array.isArray(objects)) all.push(...objects);
    } catch {
      // Skip systems with missing or unreadable files
    }
  }
  return all;
}

// GET /api/objects — paginated, filtered, sorted list (OBJ-01..03)
router.get('/', async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { tier, rbac, type, pim, onprem, q, page, pageSize, sortBy, sortDir } = parsed.data;
  let objects = await loadAllObjects();

  if (tier && tier.length > 0) {
    objects = objects.filter(o => tier.includes(o.ObjectAdminTierLevelName));
  }
  if (rbac && rbac.length > 0) {
    objects = objects.filter(o => rbac.includes(o.RoleSystem));
  }
  if (type && type.length > 0) {
    objects = objects.filter(o => type.includes(o.ObjectType));
  }
  if (pim && pim.length > 0) {
    objects = objects.filter(o =>
      o.RoleAssignments?.some(r => pim.includes(r.PIMAssignmentType))
    );
  }
  if (onprem && onprem.length > 0) {
    objects = objects.filter(o => {
      const val = o.OnPremSynchronized;
      const normalised = val === true ? 'true' : val === false ? 'false' : 'null';
      return onprem.includes(normalised);
    });
  }
  if (q && q.trim()) {
    const search = q.trim().toLowerCase();
    objects = objects.filter(o =>
      o.ObjectDisplayName?.toLowerCase().includes(search) ||
      o.ObjectUserPrincipalName?.toLowerCase().includes(search)
    );
  }

  // Sorting
  const sortKey = sortBy as keyof PrivilegedObject;
  objects.sort((a, b) => {
    const av = String(a[sortKey] ?? '');
    const bv = String(b[sortKey] ?? '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const total = objects.length;
  const sliced = objects.slice(page * pageSize, (page + 1) * pageSize);

  res.json({ objects: sliced, total, page, pageSize });
});

// GET /api/objects/:id — single object by ObjectId
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const all = await loadAllObjects();
  const found = all.find(o => o.ObjectId === id);
  if (!found) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(found);
});

export { router as objectsRouter };
