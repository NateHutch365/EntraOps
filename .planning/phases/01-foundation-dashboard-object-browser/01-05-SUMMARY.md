---
plan: 01-05
phase: 01-foundation-dashboard-object-browser
status: complete
completed: 2026-03-24
commits:
  - cd1cb66
  - 6a9db53
---

# Plan 01-05 Summary: Dashboard UI Components

## What Was Built

All Dashboard UI components wired to `/api/dashboard` — the first user-visible page that proves the data pipeline works end-to-end.

## Key Files Created

### created
- `gui/client/src/lib/api.ts` — Generic `fetchApi<T>` utility; throws typed error on non-ok responses
- `gui/client/src/hooks/useDashboard.ts` — React hook with `{ data, isLoading, error, refetch }` — cancellation-safe useEffect, trigger-based refetch
- `gui/client/src/components/dashboard/KPICard.tsx` — Tier KPI card: 28px count, tier-colored badge, PIM Permanent/Eligible mini-stats with 4px accent bar
- `gui/client/src/components/dashboard/DataFreshness.tsx` — Shows formatted last-updated timestamp from `freshness` field
- `gui/client/src/components/dashboard/RecentCommits.tsx` — Shows last N commits with hash, message, and date; empty state message when no commits
- `gui/client/src/components/dashboard/TierBarChart.tsx` — Horizontal stacked bar chart (Recharts, `layout="vertical"`, fixed `h-[200px]` container)
- `gui/client/src/pages/Dashboard.tsx` — Full page: KPI row + RBAC chart + utility widgets row + EmptyState (DASH-07)

### modified
- `gui/client/package.json` — Added `@types/react` and `@types/react-dom` devDependencies (pre-existing gap — React 19.2.4 does not ship bundled types)

## Implementation Notes

**@types/react gap:** The workspace was missing `@types/react` and `@types/react-dom`. React 19.2.4 does not bundle TypeScript declarations. These were added to `gui/client` devDependencies. Two remaining TS errors in pre-existing files (`main.tsx` CSS side-effect import, `test-setup.ts` jest-dom import) are pre-existing infrastructure issues from plans 01-01/01-03 unrelated to this plan.

**TierBarChart fixed-height:** Used `<div className="h-[200px] w-full">` wrapper around `<ResponsiveContainer width="100%" height="100%">` per plan guidance — avoids the Recharts 0-height trap with auto-height parents.

**Shared type imports:** Used relative path (`../../../shared/types/api`) from hooks and (`../../../../shared/types/api`) from components/dashboard — Vite + bundler moduleResolution resolves correctly.

**Tier color classes:** `text-tier-control`, `text-tier-management`, `text-tier-user` — all mapped to CSS custom properties in `globals.css` via `@theme inline`.

**EmptyState copy:** Exact text `Save-EntraOpsPrivilegedEAMJson` in code block; "Check Again" button calls `refetch()` from `useDashboard`.

## Verification Results

All plan verification checks passed:
- ✓ All 7 files created
- ✓ `h-[200px]` in TierBarChart (fixed-height Recharts container)
- ✓ `Save-EntraOpsPrivilegedEAMJson` in Dashboard (EmptyState copy)
- ✓ `export function useDashboard` present
- ✓ `!data || !data.hasData` EmptyState guard present
- ✓ No TypeScript errors in new dashboard files

## Requirements Addressed

DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07

## Self-Check: PASSED

All must_haves satisfied:
- Dashboard renders 3 KPI cards (ControlPlane / ManagementPlane / UserAccess) ✓
- Each KPI card shows tier count at 28px, tier-colored badge, PIM Permanent/Eligible stats ✓
- RBAC stacked horizontal bar chart uses fixed h-[200px] (not 0-height) ✓
- Recent commits widget present ✓
- Data freshness widget present ✓
- EmptyState with 'Save-EntraOpsPrivilegedEAMJson' and 'Check Again' button ✓
- Per-widget error isolation via useDashboard error state ✓
