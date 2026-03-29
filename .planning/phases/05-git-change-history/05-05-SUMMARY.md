---
phase: 05-git-change-history
plan: 05
subsystem: ui
tags: [react, history, git, verification, rbac]

requires:
  - phase: 05-03
    provides: History page UI with commit list, RBAC tabs, compare flow
  - phase: 05-04
    provides: Compare page with structured diff and raw diff viewer

provides:
  - Verified end-to-end History feature: paginated list, expand, RBAC filter, compare flow
  - Bug fix: git log parser rewritten to use 40-char hash boundary detection (fixes Invalid Date and misaligned columns)
  - Bug fix: pagination hides when RBAC filter active; filter resets to page 1

affects: []

tech-stack:
  added: []
  patterns:
    - "Client-side filter + server pagination: hide pagination controls when filter active to avoid stale page counts"

key-files:
  created: []
  modified:
    - gui/server/services/gitHistory.ts
    - gui/client/src/pages/HistoryPage.tsx

key-decisions:
  - "Fixed parseRawLog to detect commits by 40-char hex hash instead of splitting on double newlines — git log --name-only inserts a blank line between header and file list causing the old parser to treat file paths as commit headers"
  - "Pagination hidden (not disabled) when RBAC filter active — filtering is client-side so page count from server is meaningless while filtered"

patterns-established: []

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-04]

duration: 30min
completed: 2026-03-26
---

# Phase 05: git-change-history — Verification Summary

**End-to-end History feature verified: commit list, RBAC filtering, expandable rows with tier sections, compare flow — with two bugs found and fixed during UAT.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-03-26
- **Tasks:** 1 (human verification checkpoint)
- **Files modified:** 2

## Accomplishments

- Verified full end-to-end History flow: paginated commit list → expand row → RBAC system tabs → ControlPlane blue border styling
- Verified RBAC System filter chip filters commit list correctly
- Verified 2-commit checkbox selection → sticky compare bar → Compare page with From/To header, structured changes, raw diff
- Fixed git log parser bug causing "Invalid Date" and misaligned hash/author columns
- Fixed pagination showing stale page count when RBAC filter is active

## Task Commits

1. **UAT verification + bug fixes** — `ef3671c` (seed data), parser fix in `gitHistory.ts`, pagination fix in `HistoryPage.tsx`

## Files Created/Modified

- `gui/server/services/gitHistory.ts` — rewrote `parseRawLog` to use 40-char hash boundary detection
- `gui/client/src/pages/HistoryPage.tsx` — added `isFiltered` flag, `handleRbacFilterChange`, hid pagination when filter active

## Decisions Made

Pagination is hidden (not disabled or recalculated) when a filter is active. Since the RBAC filter is client-side and operates on the current page only, showing page controls with stale server totals would be misleading. The correct long-term fix would be server-side filtering, but hiding is the right scope for this phase.

## Deviations from Plan

### Auto-fixed Issues

**1. git log parser — Invalid Date and misaligned columns**
- **Found during:** UAT seeding
- **Issue:** `parseRawLog` split on `\n\n+` but `git log --name-only` inserts a blank line between the 5-line header block and the file list, causing file paths to be parsed as commit entries
- **Fix:** Rewrote parser to scan line-by-line, using `/^[0-9a-f]{40}$/i` to detect commit boundaries
- **Files modified:** `gui/server/services/gitHistory.ts`

**2. Pagination stale when RBAC filter active**
- **Found during:** UAT — RBAC filter applied, pagination still showed "Page 1 of 14"
- **Issue:** `totalPages` derived from `data.total` (server count), unaffected by client-side filter
- **Fix:** Added `isFiltered` flag; pagination hidden when any RBAC filter is selected; filter handler resets page to 1
- **Files modified:** `gui/client/src/pages/HistoryPage.tsx`

**Total deviations:** 2 auto-fixed
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the two auto-fixed bugs above.
