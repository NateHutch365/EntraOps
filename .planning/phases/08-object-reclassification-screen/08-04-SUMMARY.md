---
phase: 08-object-reclassification-screen
plan: 04
subsystem: ui
tags: [react, react-router, sidebar, radix-ui, select]

# Dependency graph
requires:
  - phase: 08-03
    provides: ReclassifyPage component + useOverrides hook fully implemented
provides:
  - /reclassify route registered in App.tsx and reachable from the browser
  - Reclassify nav item in sidebar with SlidersHorizontal icon
  - All 5 RECL requirements human-verified in browser
affects:
  - Any future phase that adds sidebar nav items or modifies App.tsx route list

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "__none__ sentinel for Radix SelectItem when a real null/empty-string value is needed"
    - "pageSize=10000 pattern for bulk-load endpoints consumed by admin screens"

key-files:
  created: []
  modified:
    - gui/client/src/App.tsx
    - gui/client/src/components/layout/Sidebar.tsx
    - gui/server/routes/objects.ts
    - gui/client/src/pages/ReclassifyPage.tsx

key-decisions:
  - "Radix UI SelectItem rejects empty-string value — use __none__ sentinel constant and convert to null on save"
  - "pageSize cap raised from 200 → 10000 on GET /api/objects to allow Reclassify to load full tenant dataset"

patterns-established:
  - "NO_OVERRIDE='__none__' sentinel: avoids Radix empty-string crash; map back to null before POSTing to server"

requirements-completed: [RECL-01, RECL-02, RECL-03, RECL-04, RECL-05]

# Metrics
duration: 20min
completed: 2026-03-28
---

# Phase 8 Plan 04: /reclassify Route Wiring + Browser Verification Summary

**Wired /reclassify into App.tsx and sidebar, then human-verified all 5 RECL requirements in the browser — including two bug fixes found during live testing.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-28T14:00:00Z
- **Completed:** 2026-03-28T14:37:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments

- Registered `<Route path="reclassify" element={<ReclassifyPage />} />` in App.tsx
- Added Reclassify nav item (SlidersHorizontal icon) to Sidebar.tsx between Browse Objects and Templates
- Fixed pageSize cap (200 → 10000) so ReclassifyPage can load all tenant objects
- Fixed Radix SelectItem empty-string crash with `__none__` sentinel constant
- All 5 RECL requirements passed human verification in browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire /reclassify route and Reclassify sidebar nav item** - `91d96bb` (feat)
2. **Task 2: Human-verify checkpoint (approved)** — no task commit (verification only)

**Bug-fix commits (found during Task 2 verification):**
- `d24e9e7` — fix: raise pageSize cap from 200 to 10000 in objects route
- `070728d` — fix: replace empty-string SelectItem value with __none__ sentinel

## Files Created/Modified

- `gui/client/src/App.tsx` — added `ReclassifyPage` import and `<Route path="reclassify">` inside AppShell
- `gui/client/src/components/layout/Sidebar.tsx` — added `SlidersHorizontal` import and Reclassify nav item
- `gui/server/routes/objects.ts` — raised `pageSize` Zod max from 200 → 10000
- `gui/client/src/pages/ReclassifyPage.tsx` — added `NO_OVERRIDE='__none__'` sentinel, replaced empty-string `SelectItem` value

## Decisions Made

- **`__none__` sentinel for SelectItem:** Radix UI throws a runtime warning/error when a `<SelectItem>` has `value=""`. Using `NO_OVERRIDE = '__none__'` avoids the crash and is converted to `null` before POSTing to the server.
- **pageSize=10000 ceiling:** The Reclassify screen needs all objects in one fetch. The previous 200-item cap was designed for paginated browse; admin reclassification requires a bulk-load pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pageSize cap of 200 blocked full object load in ReclassifyPage**
- **Found during:** Task 2 (browser verification — table only showed 200 rows)
- **Issue:** `GET /api/objects?pageSize=10000` was silently capped to 200 by the Zod schema `.max(200)` validator
- **Fix:** Changed `.max(200)` to `.max(10000)` in `gui/server/routes/objects.ts` line 34
- **Files modified:** `gui/server/routes/objects.ts`
- **Verification:** Reloaded Reclassify — all objects loaded
- **Committed in:** `d24e9e7`

**2. [Rule 1 - Bug] Radix SelectItem empty-string value caused console error**
- **Found during:** Task 2 (browser verification — console showed Radix warning)
- **Issue:** `<SelectItem value="">` triggers "A SelectItem must have a non-empty string value" from Radix Select primitive
- **Fix:** Added `const NO_OVERRIDE = '__none__'` constant; all `""` references replaced; `handleOverrideChange` converts `__none__` → `null` before storing; `getEffectiveOverride` returns `__none__` as default
- **Files modified:** `gui/client/src/pages/ReclassifyPage.tsx`
- **Verification:** Console error gone; "— No override" option selects and saves correctly
- **Committed in:** `070728d`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes were necessary for correct operation. No scope creep.

## Issues Encountered

None beyond the two bugs documented above, which were caught and fixed during the human-verify checkpoint.

## Known Stubs

None — all data is wired to live API endpoints.
