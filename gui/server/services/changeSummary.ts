import type { PrivilegedObject } from '../../shared/types/eam.js';
import type { TierSectionChanges, ObjectChange, RoleAssignmentDelta, EamTier } from '../../shared/types/api.js';

const TIER_ORDER: Array<'ControlPlane' | 'ManagementPlane' | 'UserAccess'> = [
  'ControlPlane',
  'ManagementPlane',
  'UserAccess',
];

function emptySection(tier: 'ControlPlane' | 'ManagementPlane' | 'UserAccess'): TierSectionChanges {
  return { tier, added: [], removed: [], tierChanged: [] };
}

export function computeRoleAssignmentDelta(
  parentObj: PrivilegedObject,
  currentObj: PrivilegedObject,
): RoleAssignmentDelta[] {
  const parentMap = new Map(parentObj.RoleAssignments.map(r => [r.RoleAssignmentId, r]));
  const currentMap = new Map(currentObj.RoleAssignments.map(r => [r.RoleAssignmentId, r]));

  const delta: RoleAssignmentDelta[] = [];

  for (const [id, assignment] of currentMap) {
    if (!parentMap.has(id)) {
      delta.push({
        action: 'added',
        roleDefinitionName: assignment.RoleDefinitionName,
        tier: (assignment.Classification[0]?.AdminTierLevelName ?? 'Unclassified') as EamTier,
      });
    }
  }

  for (const [id, assignment] of parentMap) {
    if (!currentMap.has(id)) {
      delta.push({
        action: 'removed',
        roleDefinitionName: assignment.RoleDefinitionName,
        tier: (assignment.Classification[0]?.AdminTierLevelName ?? 'Unclassified') as EamTier,
      });
    }
  }

  return delta;
}

export function computeChangeSummary(
  parentObjects: PrivilegedObject[],
  currentObjects: PrivilegedObject[],
): TierSectionChanges[] {
  const parentMap = new Map(parentObjects.map(o => [o.ObjectId, o]));
  const currentMap = new Map(currentObjects.map(o => [o.ObjectId, o]));

  const sections = new Map<string, TierSectionChanges>(
    TIER_ORDER.map(tier => [tier, emptySection(tier)]),
  );

  // Walk current objects: detect added and tierChanged
  for (const [id, current] of currentMap) {
    const tier = current.ObjectAdminTierLevelName;
    if (tier === 'Unclassified') continue;

    const section = sections.get(tier);
    if (!section) continue;

    const parent = parentMap.get(id);

    if (!parent) {
      // Object is new
      const change: ObjectChange = {
        objectId: current.ObjectId,
        objectDisplayName: current.ObjectDisplayName,
        objectType: current.ObjectType,
        changeType: 'added',
      };
      section.added.push(change);
    } else if (parent.ObjectAdminTierLevelName !== tier) {
      // Object moved to a different tier
      const change: ObjectChange = {
        objectId: current.ObjectId,
        objectDisplayName: current.ObjectDisplayName,
        objectType: current.ObjectType,
        changeType: 'tierChanged',
        previousTier: parent.ObjectAdminTierLevelName as 'ControlPlane' | 'ManagementPlane' | 'UserAccess',
        currentTier: tier,
        roleAssignmentDelta: computeRoleAssignmentDelta(parent, current),
      };
      section.tierChanged.push(change);
    }
  }

  // Walk parent objects: detect removed
  for (const [id, parent] of parentMap) {
    const tier = parent.ObjectAdminTierLevelName;
    if (tier === 'Unclassified') continue;

    if (!currentMap.has(id)) {
      const section = sections.get(tier);
      if (!section) continue;

      const change: ObjectChange = {
        objectId: parent.ObjectId,
        objectDisplayName: parent.ObjectDisplayName,
        objectType: parent.ObjectType,
        changeType: 'removed',
      };
      section.removed.push(change);
    }
  }

  // Return in canonical order: ControlPlane, ManagementPlane, UserAccess
  return TIER_ORDER.map(tier => sections.get(tier)!);
}
