---
phase: 05-git-change-history
plan: 03
subsystem: ui
tags: [react, typescript, tailwind, shadcn, nuqs, git-history]

requires: [05-01, 05-02]
provides:
  - "GET /history page with paginated commit list (HIST-01)"
  - "Expandable commit rows with lazy-loaded structured change summaries per RBAC system (HIST-02, HIST-03)"
  - "RBAC filter chips for client-side filtering (HIST-05)"
  - "Commit checkbox selection with sticky compare bar (HIST-05)"
  - "History sidebar nav entry"
affects: [05-04, 05-05]

tech-stack:
  added: []
  patterns:
    - "Lazy tab loading: visitedTabs Set in RbacSystemTabs — triggers fetch only on first tab activation"
    - "Inline fetch pattern in render phase (not useEffect) for on-demand expand/tab loading"
    - "Client-side RBAC filter using affectedSystems.some() — no re-fetch"
    - "Max-2 checkbox selection: shift oldest on 3rd click"
    - "useQueryState (nuqs) for page URL state"

key-files:
  created:
    - gui/client/src/hooks/useCommits.ts
    - gui/client/src/components/history/ObjectChangeRow.tsx
    - gui/client/src/components/history/TierSection.tsx
    - gui/client/src/components/history/ChangeSummary.tsx
    - gui/client/src/components/history/RbacSystemTabs.tsx
    - gui/client/src/components/history/RbacFilterBar.tsx
    - gui/client/src/components/history/StickyCompareBar.tsx
    - gui/client/src/components/history/CommitRow.tsx
    - gui/client/src/pages/HistoryPage.tsx
  modified:
    - gui/client/src/App.tsx
    - gui/client/src/components/layout/Sidebar.tsx

key-decisions:
  - "Lazy loading implemented via visitedTabs Set rather than useEffect — avoids double-fetch on mount/activation"
  - "StickyCompareBar uses margin-left with CSS var(--sidebar-width, 0px) for sidebar offset"
  - "ControlPlane: border-l-4 border-tier-control bg-tier-control/5 per UI-SPEC"
  - "useQueryState (nuqs) for page param — consistent with ObjectBrowser pattern"
  - "History icon from lucide-react for sidebar nav"

patterns-established:
  - "history/ component directory created — all History-specific components live here"
  - "RbacSystemTabs: systems prop drives tab list, filterd/ordered by RBAC_ORDER constant"
  - "TierSection always shows ControlPlane first even if empty"

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-05]

duration: 5min
completed: 2026-03-26
---

# Phase 05-03: History Page UI Summary

**Complete History page UI with 8 sub-components, useCommits hook, route wiring, and sidebar nav entry**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created `useCommits` hook following the `useObjects` pattern — URLSearchParams, fetchApi, cancellation token
- Created 8 history components: `ObjectChangeRow`, `TierSection`, `ChangeSummary`, `RbacSystemTabs`, `RbacFilterBar`, `StickyCompareBar`, `CommitRow`, `HistoryPage`
- `ControlPlane` section renders with `border-l-4 border-tier-control bg-tier-control/5` — visually distinct per UI-SPEC
- `CommitRow` lazy-fetches affected systems (`/api/git/commits/{hash}/systems`) only on expand
- `RbacSystemTabs` lazy-fetches change summary per tab on first activation via `visitedTabs` Set
- `RbacFilterBar` uses Popover + Command pattern (same as `ObjectFilters`) with dismissible Badge chips
- `StickyCompareBar` is fixed-positioned, shows context-sensitive text (1 selected: prompt; 2 selected: CTA button)
- `/history` route added to `App.tsx`; `History` icon added to `Sidebar.tsx` NAV_ITEMS between Templates and Run Commands

## Task Commits

1. **Tasks 1+2: History page UI — all components, hook, route, sidebar** — `a94d95c` (feat)

## Files Created/Modified

- `gui/client/src/hooks/useCommits.ts` — `useCommits({ page, pageSize })` → `CommitListResponse`
- `gui/client/src/components/history/ObjectChangeRow.tsx` — single change row with tier-change badge and role delta
- `gui/client/src/components/history/TierSection.tsx` — tier section with `border-l-4` ControlPlane distinction
- `gui/client/src/components/history/ChangeSummary.tsx` — renders 3 tier sections in fixed order
- `gui/client/src/components/history/RbacSystemTabs.tsx` — RBAC system tabs with lazy per-tab loading
- `gui/client/src/components/history/RbacFilterBar.tsx` — Popover + Command multi-select with dismissible chips
- `gui/client/src/components/history/StickyCompareBar.tsx` — fixed bottom bar, null when 0 selected
- `gui/client/src/components/history/CommitRow.tsx` — expandable row with checkbox and lazy system fetch
- `gui/client/src/pages/HistoryPage.tsx` — main page with filter, list, pagination, compare bar
- `gui/client/src/App.tsx` — `<Route path="history" element={<HistoryPage />} />` added
- `gui/client/src/components/layout/Sidebar.tsx` — History nav entry added after Templates

## Decisions Made

- Used `visitedTabs` Set for lazy tab loading rather than `useEffect` — avoids double-fetch on initial render
- `StickyCompareBar` uses `style={{ marginLeft: 'var(--sidebar-width, 0px)' }}` for sidebar offset compatibility
- `History` icon from lucide-react is available and semantically appropriate

## Deviations from Plan

None — plan executed as written. TypeScript check passed with zero errors.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- `RbacSystemTabs` accepts `mode="compare"` and `sectionsBySystem` prop — ready for plan 05-04 (Compare page)
- All types from `api.ts` imported correctly; no new type additions needed
- `/history/compare` route not yet mounted — plan 05-04 adds it

---
*Phase: 05-git-change-history*
*Completed: 2026-03-26*
