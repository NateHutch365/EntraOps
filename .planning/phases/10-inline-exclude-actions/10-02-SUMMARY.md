---
phase: 10-inline-exclude-actions
plan: "02"
subsystem: ui
tags: [react, typescript, tanstack-table, useMemo, hooks, toast, sonner]

requires:
  - phase: 10-inline-exclude-actions
    plan: "01"
    provides: addExclusion(guid) from useExclusions, POST /api/exclusions contract

provides:
  - ObjectTable with 7th Actions column (ShieldMinus Exclude button, loading spinner, Excluded badge)
  - ObjectBrowser wired with useExclusions + handleExclude + pendingExcludes state
  - Excluded rows dim with opacity-60 + Excluded badge in Display Name cell and Actions cell

affects: [any page that renders ObjectTable]

tech-stack:
  added: []
  patterns:
    - columns converted to useMemo inside component to close over excludedIds/loadingIds/onExclude props
    - pendingExcludes Set tracks in-flight GUIDs for per-row loading state
    - e.stopPropagation() on Exclude button prevents row click (detail panel) from firing

key-files:
  created: []
  modified:
    - gui/client/src/components/objects/ObjectTable.tsx
    - gui/client/src/pages/ObjectBrowser.tsx

key-decisions:
  - "react-router (not react-router-dom) per project convention"
  - "useMemo dependency array: [excludedIds, loadingIds, onExclude] — all props that affect column rendering"

patterns-established:
  - "ObjectTable accepts excludedIds/loadingIds/onExclude as optional props — backward-compatible"

requirements-completed:
  - EXCL-04

duration: 20min
completed: 2026-04-02
---

# Phase 10-02: ObjectTable Actions Column + ObjectBrowser Wiring

**Added 7-column ObjectTable with inline Exclude action and wired ObjectBrowser to handle exclude flow with toast feedback.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-04-02
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ObjectTable now has 7 columns; Actions column renders ShieldMinus "Exclude" button with stopPropagation
- In-flight rows show Loader2 spinner + disabled button (pendingExcludes Set)
- Already-excluded rows: opacity-60: "Excluded" badge in Display Name cell and in Actions cell
- ObjectBrowser wires useExclusions, manages pendingExcludes, handleExclude with success/error toasts
- Toast on success: "Object excluded" with "View Exclusions →" action navigating to /exclusions

## Task Commits

1. **Task 1 + Task 2: ObjectTable + ObjectBrowser** - `72a65ee` (feat)

## Files Created/Modified
- `gui/client/src/components/objects/ObjectTable.tsx` - 7 columns, useMemo, ShieldMinus, opacity-60, excluded badge
- `gui/client/src/pages/ObjectBrowser.tsx` - useExclusions wiring, pendingExcludes, handleExclude, toast

## Decisions Made
- Used `react-router` (not `react-router-dom`) matching project convention in HistoryPage and ConnectPage

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
Minor: `react-router-dom` used initially; corrected to `react-router` per project convention (auto-fixed).

## User Setup Required
None

## Next Phase Readiness
EXCL-04 complete. ObjectBrowser fully wired. No blockers for phase verification.

---
*Phase: 10-inline-exclude-actions*
*Completed: 2026-04-02*
