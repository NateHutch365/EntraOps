---
plan: 01-06
phase: 01-foundation-dashboard-object-browser
status: complete
completed: 2026-03-24
commits:
  - e30b8a0
  - 211e159
---

# Plan 01-06 Summary: Object Browser Page

## What Was Built

Full Object Browser page with filterable, sortable, paginated table of all
`PrivilegedObject` records. URL-driven state via nuqs. TanStack Table in
manual server-side mode.

## Key Files Created

### created
- `gui/client/src/hooks/useObjects.ts` — Typed fetch of `/api/objects` with
  all URL params; converts 1-based URL page to 0-based server page; returns
  `{ data: ObjectsResponse | null, isLoading, error }`
- `gui/client/src/components/objects/ObjectFilters.tsx` — Search Input + 5
  multi-select Popover+Command filter controls (Tier, RBAC System, Object
  Type, PIM Type, On-Prem Sync); active filter chips with `border-fluent-accent`
  styling and individual × dismiss buttons
- `gui/client/src/components/objects/ObjectTable.tsx` — TanStack Table in
  manual mode (`manualPagination: true`, `manualSorting: true`,
  `manualFiltering: true`; `getCoreRowModel` only); 6 columns with real
  `PrivilegedObject` field names; semi-transparent loading overlay; sortable
  column headers; Previous/Next pagination controls
- `gui/client/src/components/ui/input.tsx` — Added missing shadcn/ui Input
  component (was not installed in prior plans)

### modified
- `gui/client/src/pages/ObjectBrowser.tsx` — Replaced stub with full page
  wiring `useQueryStates` (nuqs) → `useObjects` → `ObjectFilters` + `ObjectTable`

## Implementation Notes

**Real field names vs plan template:** The plan template used simplified/incorrect
field names. Implementation uses actual `PrivilegedObject` field names:
`ObjectDisplayName`, `ObjectAdminTierLevelName`, `RoleSystem`, `OnPremSynchronized`.
Sort params mapped to server names: URL `sort`/`order` → server `sortBy`/`sortDir`.

**PIM Type column:** No single `PimType` field on `PrivilegedObject`. Derived from
`RoleAssignments[*].PIMAssignmentType` — shows 'Eligible' if any assignment is
eligible, 'Permanent' if any permanent, otherwise '—'.

**PIM filter options:** Plan template had incorrect values. Used actual
`PimAssignmentType` values: `'Permanent' | 'Eligible' | 'NoAssignment'`.

**nuqs import fix:** `useQueryStates` is NOT exported from `nuqs/adapters/react-router/v7`
(which only exports `NuqsAdapter` + `useOptimisticSearchParams`). Imported from
main `nuqs` package instead.

**Page offset:** Server uses 0-based page; URL uses 1-based. Hook subtracts 1
before sending to server, adds 1 back to response page for consistent consumer API.

**Pre-existing TS errors:** `main.tsx` (CSS side-effect import) and `test-setup.ts`
(jest-dom import) continue to fail `tsc -b`. These are pre-existing from plans
01-01/01-03. No new TypeScript errors introduced by this plan.

## Verification Results

- ✓ `manualPagination: true` in ObjectTable.tsx
- ✓ No `getSortedRowModel` or `getPaginationRowModel` (comment only, not imported)
- ✓ `useQueryStates` imported from `nuqs` (correct package)
- ✓ `border-fluent-accent` on active filter chips in ObjectFilters.tsx
- ✓ Loading overlay `absolute inset-0 bg-background/60 z-10` in ObjectTable.tsx
- ✓ `encodeURIComponent(object.ObjectId)` on row click navigation
- ✓ All 4 files exist and committed
- ✓ All filter changes pass `page: 1` to reset pagination
- ✓ No new TypeScript errors introduced
