---
phase: 07-computed-tier-surfaces
plan: 01
subsystem: api
tags: [typescript, express, eam, tier-classification, dashboard]

requires: []
provides:
  - "computedTierName() pure function in gui/shared/utils/tier.ts"
  - "SuggestedTierCounts interface in gui/shared/types/api.ts"
  - "suggestedTiers field on DashboardResponse type"
  - "suggestedTiers aggregation in GET /api/dashboard route"
affects: [07-computed-tier-surfaces]

tech-stack:
  added: []
  patterns:
    - "Shared utility in gui/shared/utils/ consumed by both server and client"
    - "Priority-based tier reduction: ControlPlane > ManagementPlane > UserAccess > null"

key-files:
  created:
    - gui/shared/utils/tier.ts
  modified:
    - gui/shared/types/api.ts
    - gui/server/routes/dashboard.ts

key-decisions:
  - "computedTierName accepts Classification[] directly (not PrivilegedObject) to avoid circular dependencies"
  - "suggestedTiers counts ALL objects with a non-null computedTierName result (not just Unclassified)"
  - "EMPTY_RESPONSE includes suggestedTiers with zero counts to satisfy the DashboardResponse type contract"

patterns-established:
  - "Tier priority reduction: check ControlPlane first, then ManagementPlane, then UserAccess — return first match"

requirements-completed: [DASH-01, DASH-02]

duration: 25min
completed: 2026-03-26
---

# Phase 07-01: Tier Utility, API Types, and Server Aggregation Summary

**`computedTierName()` pure function, `SuggestedTierCounts` API type, and `suggestedTiers` aggregation wired into `GET /api/dashboard`**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created `gui/shared/utils/tier.ts` with `computedTierName(classifications)` — priority-based tier reducer returning `ControlPlane | ManagementPlane | UserAccess | null`
- Extended `DashboardResponse` with `suggestedTiers: SuggestedTierCounts` field and added `SuggestedTierCounts` interface to `api.ts`
- Wired aggregation loop into dashboard route — counts objects whose `computedTierName` returns non-null, keyed by tier

## Task Commits

1. **Task 1: Create computedTierName utility** - `d96005a` (feat)
2. **Task 2: Extend API types and wire dashboard aggregation** - `17864e4` (feat)

## Files Created/Modified
- `gui/shared/utils/tier.ts` - Pure `computedTierName(Classification[])` function
- `gui/shared/types/api.ts` - Added `SuggestedTierCounts` interface + `suggestedTiers` field on `DashboardResponse`
- `gui/server/routes/dashboard.ts` - Imports `computedTierName`, adds aggregation loop, includes `suggestedTiers` in response JSON and `EMPTY_RESPONSE`

## Decisions Made
- Accepted `Classification[]` directly rather than `Pick<PrivilegedObject, 'Classification'>` to keep the utility dependency-free and easy to call from both server and client contexts
- All objects are evaluated for suggestedTiers (not only Unclassified), consistent with must_haves spec

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Dashboard endpoint now returns `suggestedTiers` — Plan 07-02 can consume `data.suggestedTiers[tier]` immediately
- `computedTierName` is importable from `gui/shared/utils/tier.js` for use in ObjectTable

---
*Phase: 07-computed-tier-surfaces*
*Completed: 2026-03-26*
