---
phase: 05-git-change-history
plan: "04"
subsystem: frontend-compare
tags: [react, compare, git-history, diff-viewer]
dependency_graph:
  requires: [05-02, 05-03]
  provides: [compare-page, commit-compare-header, raw-diff-viewer, use-compare-hook]
  affects: [App.tsx routes, history navigation]
tech_stack:
  added: []
  patterns: [nuqs-query-params, parallel-fetch-aggregation, tab-on-demand-compare]
key_files:
  created:
    - gui/client/src/hooks/useCompare.ts
    - gui/client/src/components/history/CommitCompareHeader.tsx
    - gui/client/src/components/history/RawDiffViewer.tsx
    - gui/client/src/pages/ComparePage.tsx
  modified:
    - gui/client/src/App.tsx
decisions:
  - "useCompare aggregates 5 parallel /api/git/compare?rbac=X calls instead of single endpoint because backend API is per-system"
  - "rawDiff is concatenated from all systems' diffs with newline separator"
  - "affectedSystems computed from non-empty TierSectionChanges (any of added/removed/tierChanged > 0)"
  - "history/compare route placed before history route in App.tsx for specificity"
metrics:
  duration: ~20min
  completed: "2026-03-26"
  tasks: 2
  files: 5
requirements: [HIST-04]
---

# Phase 05 Plan 04: Compare Page Summary

Compare page with side-by-side commit metadata header, RBAC system tabs showing structured change summary, and raw git diff viewer with green/red line coloring — route `/history/compare?from=X&to=Y`.

## What Was Built

### Task 1: useCompare hook + display components (b53f5a7)

**`gui/client/src/hooks/useCompare.ts`**
- Takes `{ from: string | null; to: string | null }` params
- Only fetches when both params are non-null
- Calls all 5 RBAC system compare endpoints in parallel (Promise.all)
- Aggregates: `sectionsBySystem`, `affectedSystems` (systems with any changes), `rawDiff` (concatenated)
- Exports `AggregatedComparison` interface
- Same cancel-on-unmount pattern as `useCommits`

**`gui/client/src/components/history/CommitCompareHeader.tsx`**
- Props: `{ from: GitCommit & { fullHash: string }, to: GitCommit & { fullHash: string } }`
- 3-column grid on lg (card | arrow | card), stacks on sm
- Each card shows: "From"/"To" badge, full hash (mono), commit message, author · date
- Uses `ArrowRight` lucide icon between columns on large screens

**`gui/client/src/components/history/RawDiffViewer.tsx`**
- Props: `{ diff: string }`
- Splits diff by `\n`, maps each line to `<span className={...}>` inside `<pre>`
- Line coloring: `+` → green, `-` → red, `@@` → blue, `diff --git` → bold muted, other → muted
- `+++`/`---` header lines excluded from add/remove coloring
- Empty diff shows "No raw diff available" message

### Task 2: ComparePage + Route (4553748)

**`gui/client/src/pages/ComparePage.tsx`**
- Reads `from` and `to` from URL search params via `nuqs` (`parseAsString`)
- Missing params → error banner with "Go back to History and select two commits"
- Uses `useCompare({ from, to })` for all data
- Loading: skeleton placeholders for header + content areas
- Error: red alert banner
- Loaded: `CommitCompareHeader` → `Separator` → structured changes (RbacSystemTabs compare mode) → `Separator` → `RawDiffViewer`
- Empty affectedSystems → "No PrivilegedEAM/ changes between these commits"
- Back link to `/history` with `ArrowLeft` icon

**`gui/client/src/App.tsx`**
- Imported `ComparePage`
- Added `<Route path="history/compare" element={<ComparePage />} />` before `path="history"` route

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] API shape mismatch: plan assumed single-call compare endpoint**

- **Found during:** Task 1 (reading backend implementation)
- **Issue:** Plan context described `ComparisonResult` with `{ affectedSystems: RbacSystem[], changesBySystem: Record<RbacSystem, TierSectionChanges[]> }`, but backend `/api/git/compare?from=X&to=Y&rbac=Z` returns per-system data (requires `rbac` param)
- **Fix:** `useCompare` aggregates 5 parallel per-system calls; `AggregatedComparison` interface captures the aggregated shape
- **Files modified:** `gui/client/src/hooks/useCompare.ts`
- **Commit:** b53f5a7

**2. [Rule 2 - Missing logic] Reused RbacSystemTabs instead of inline tabs**

- **Found during:** Task 2
- **Issue:** Plan suggested building inline Tabs in ComparePage, but `RbacSystemTabs` already supports `mode="compare"` with `sectionsBySystem` prop
- **Fix:** Used existing `RbacSystemTabs` component — avoids duplication, leverages tab visit tracking
- **Files modified:** `gui/client/src/pages/ComparePage.tsx`
- **Commit:** 4553748

## Self-Check: PASSED

- ✅ `gui/client/src/hooks/useCompare.ts` — FOUND
- ✅ `gui/client/src/components/history/CommitCompareHeader.tsx` — FOUND
- ✅ `gui/client/src/components/history/RawDiffViewer.tsx` — FOUND  
- ✅ `gui/client/src/pages/ComparePage.tsx` — FOUND
- ✅ `path="history/compare"` route in App.tsx — FOUND
- ✅ `npx tsc --noEmit` — PASSED (0 errors)
- ✅ b53f5a7 commit exists
- ✅ 4553748 commit exists
