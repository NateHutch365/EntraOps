import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readEamJson } from '../services/eamReader.js';
import { getRecentPrivilegedEAMCommits } from '../services/gitLog.js';
import { computedTierName } from '../../shared/utils/tier.js';
import type { PrivilegedObject, EamTier, RbacSystem } from '../../shared/types/eam.js';
import type {
  DashboardResponse,
  TierCounts,
  TierPimCounts,
  RbacBreakdown,
  SuggestedTierCounts,
} from '../../shared/types/api.js';

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

async function getEamFreshness(): Promise<string | null> {
  const mtimes: number[] = [];
  for (const system of RBAC_SYSTEMS) {
    try {
      const aggregateFile = path.join(EAM_BASE, system, `${system}.json`);
      const stat = await fs.stat(aggregateFile);
      mtimes.push(stat.mtimeMs);
    } catch {
      // File not present — skip
    }
  }
  if (mtimes.length === 0) return null;
  return new Date(Math.max(...mtimes)).toISOString();
}

const EMPTY_RESPONSE: DashboardResponse = {
  hasData: false,
  tiers: { ControlPlane: 0, ManagementPlane: 0, UserAccess: 0, Unclassified: 0 },
  objectTypes: {},
  rbacBreakdown: [],
  pimTypes: {
    ControlPlane: { Permanent: 0, Eligible: 0 },
    ManagementPlane: { Permanent: 0, Eligible: 0 },
    UserAccess: { Permanent: 0, Eligible: 0 },
  },
  suggestedTiers: { ControlPlane: 0, ManagementPlane: 0, UserAccess: 0 },
  freshness: null,
  recentCommits: [],
};

router.get('/', async (_req, res) => {
  const allObjects: PrivilegedObject[] = [];

  for (const system of RBAC_SYSTEMS) {
    try {
      const aggregateFile = path.join(EAM_BASE, system, `${system}.json`);
      const objects = await readEamJson(aggregateFile) as PrivilegedObject[];
      if (Array.isArray(objects) && objects.length > 0) {
        allObjects.push(...objects);
      }
    } catch {
      // Per-widget error isolation: one broken file fails its system only
    }
  }

  if (allObjects.length === 0) {
    res.json(EMPTY_RESPONSE);
    return;
  }

  const tiers: TierCounts = { ControlPlane: 0, ManagementPlane: 0, UserAccess: 0, Unclassified: 0 };
  const objectTypes: Record<string, number> = {};
  const pimTypes: TierPimCounts = {
    ControlPlane: { Permanent: 0, Eligible: 0 },
    ManagementPlane: { Permanent: 0, Eligible: 0 },
    UserAccess: { Permanent: 0, Eligible: 0 },
  };
  const rbacByTier = new Map<EamTier, Record<RbacSystem, number>>();

  for (const obj of allObjects) {
    const tier = obj.ObjectAdminTierLevelName;

    tiers[tier] = (tiers[tier] ?? 0) + 1;
    objectTypes[obj.ObjectType] = (objectTypes[obj.ObjectType] ?? 0) + 1;

    if (!rbacByTier.has(tier)) {
      rbacByTier.set(tier, {
        EntraID: 0,
        ResourceApps: 0,
        IdentityGovernance: 0,
        DeviceManagement: 0,
        Defender: 0,
      });
    }
    const rbacRow = rbacByTier.get(tier)!;
    rbacRow[obj.RoleSystem] = (rbacRow[obj.RoleSystem] ?? 0) + 1;

    if (tier in pimTypes) {
      for (const assignment of obj.RoleAssignments ?? []) {
        if (assignment.PIMAssignmentType === 'Permanent') {
          pimTypes[tier as keyof TierPimCounts].Permanent += 1;
        } else if (assignment.PIMAssignmentType === 'Eligible') {
          pimTypes[tier as keyof TierPimCounts].Eligible += 1;
        }
      }
    }
  }

  const suggestedTiers: SuggestedTierCounts = { ControlPlane: 0, ManagementPlane: 0, UserAccess: 0 };
  for (const obj of allObjects) {
    const computedTier = computedTierName(obj.Classification);
    if (computedTier) suggestedTiers[computedTier]++;
  }

  const rbacBreakdown: RbacBreakdown[] = [];
  for (const [tier, counts] of rbacByTier.entries()) {
    rbacBreakdown.push({ tier, ...counts });
  }

  const [freshness, recentCommits] = await Promise.all([
    getEamFreshness(),
    getRecentPrivilegedEAMCommits(5),
  ]);

  const response: DashboardResponse = {
    hasData: true,
    tiers,
    suggestedTiers,
    objectTypes,
    rbacBreakdown,
    pimTypes,
    freshness,
    recentCommits,
  };

  res.json(response);
});

export { router as dashboardRouter };
