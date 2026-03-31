---
phase: 08-object-reclassification-screen
plan: 03
subsystem: ui
tags: [react, hooks, fetch, tailwind, shadcn, table, select, badge]

# Dependency graph
requires:
  - phase: 08-01
    provides: Select component and shared Override/OverridesResponse types
  - phase: 08-02
    provides: GET + POST /api/overrides endpoint
provides:
  - useOverrides hook with invalidate-triggered re-fetch pattern
  - ReclassifyPage full reclassification screen with pending Map, amber highlights, action bar
affects:
  - 08-04 (sidebar nav will add Reclassify entry pointing to ReclassifyPage)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - refreshKey in useEffect dep array to trigger re-fetch on demand (invalidate pattern)
    - pending Map<string, string|null> for unsaved row state; null = clear override
    - empty string sentinel for "no override" in Select value
    - helper functions declared outside component to avoid recreating on every render

key-files:
  created:
    - gui/client/src/hooks/useOverrides.ts
    - gui/client/src/pages/ReclassifyPage.tsx
  modified: []

key-decisions:
  - "refreshKey pattern (not TanStack Query) matches existing useObjects.ts convention"
  - "empty string sentinel for Select maps to null in pending Map — avoids undefined ambiguity"
  - "TIER_BADGE_CLASS recreated inline (not exported from ObjectTable.tsx)"
  - "buildSavePayload merges pending into persisted then removes cleared entries before POST"

patterns-established:
  - "invalidate pattern: useCallback(() => setRefreshKey(k => k+1), []) re-triggers useEffect without prop drilling"
  - "Dirty row detection: pending.has(objectId) && pendingVal !== persistedVal"

requirements-completed: [RECL-02, RECL-03, RECL-04, RECL-05]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 8 Plan 03: Create useOverrides Hook and ReclassifyPage Summary

**useOverrides GET hook with invalidate callback + full ReclassifyPage: 4-column table with pending Map, amber dirty-row highlights, per-row Override Select, and sticky Save All / Discard action bar.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T14:35:33Z
- **Completed:** 2026-03-28T14:37:13Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- `useOverrides` hook: fetches GET /api/overrides on mount, exposes `data`, `isLoading`, `error`, `invalidate`; cancelled flag and refreshKey pattern match existing codebase conventions
- `ReclassifyPage`: full reclassification table rendering all objects with Applied Tier (solid badge), Computed Tier (dashed badge), and per-row Override Select; changing a Select marks the row dirty with amber highlight
- Save All POSTs merged override payload to /api/overrides then invalidates the hook; Discard resets pending state with zero server calls; action bar shows pending count and is hidden when nothing is pending

## Task Commits

1. **Task 1: Create useOverrides.ts hook** - `3db02e5` (feat)
2. **Task 2: Create ReclassifyPage.tsx** - `5415c8a` (feat)

**Plan metadata:** _(committed with docs commit below)_

## Files Created/Modified

- `gui/client/src/hooks/useOverrides.ts` — GET /api/overrides fetch hook with useCallback invalidate and refreshKey re-fetch trigger
- `gui/client/src/pages/ReclassifyPage.tsx` — Full reclassification screen: table, pending Map, amber highlights, sticky action bar, POST save with invalidate

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- ✅ `gui/client/src/hooks/useOverrides.ts` — file exists
- ✅ `gui/client/src/pages/ReclassifyPage.tsx` — file exists
- ✅ commit `3db02e5` exists (feat: useOverrides hook)
- ✅ commit `5415c8a` exists (feat: ReclassifyPage)
- ✅ `cd gui && npx tsc --noEmit` — zero errors
- ✅ `cd gui/server && npx vitest run` — 60/60 tests PASS
