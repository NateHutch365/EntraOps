import type { Classification, EamTier } from '../types/eam.js';

/**
 * Given a Classification[], returns the "lowest" (highest privilege)
 * non-Unclassified tier present across all entries.
 *
 * Priority order (highest privilege first):
 *   1. ControlPlane
 *   2. ManagementPlane
 *   3. UserAccess
 *
 * Returns null if the array is empty or all entries are Unclassified.
 */
export function computedTierName(
  classifications: Classification[],
): Exclude<EamTier, 'Unclassified'> | null {
  if (classifications.some((c) => c.AdminTierLevelName === 'ControlPlane')) {
    return 'ControlPlane';
  }
  if (classifications.some((c) => c.AdminTierLevelName === 'ManagementPlane')) {
    return 'ManagementPlane';
  }
  if (classifications.some((c) => c.AdminTierLevelName === 'UserAccess')) {
    return 'UserAccess';
  }
  return null;
}
