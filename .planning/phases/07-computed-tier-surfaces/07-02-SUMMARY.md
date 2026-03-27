---
phase: 07-computed-tier-surfaces
plan: 02
subsystem: frontend
tags: [react, tailwind, dashboard, kpi, object-browser, tier-badge]

requires: ["07-01"]
provides:
  - "KPICard suggestedCount prop — renders 'Suggested: N' line per tier KPI card"
  - "Dashboard wires suggestedTiers from API into all three tier KPICards"
  - "ObjectTable renders dashed-border tier badge for Unclassified objects with non-empty Classification[]"
affects: [07-computed-tier-surfaces]

tech-stack:
  added: []
  patterns:
    - "Optional prop with conditional render: suggestedCount shown only when !== undefined"
    - "Tailwind border-dashed + border-2 override on Badge component for computed tier indicator"

key-files:
  created: []
  modified:
    - gui/client/src/components/dashboard/KPICard.tsx
    - gui/client/src/pages/Dashboard.tsx
    - gui/client/src/components/objects/ObjectTable.tsx

key-decisions:
  - "suggestedCount prop is optional (undefined = not rendered) so Unclassified KPICard needs no special-casing"
  - "Dashed badge reuses existing TIER_COLORS map and Badge component — className override adds border-dashed border-2 and removes default solid border"
  - "computedTierName imported from shared/utils/tier.ts (shared with server) — no duplication of priority logic"

patterns-established:
  - "Optional numeric prop pattern for KPI sub-stats: prop=undefined hides the line, prop=0 shows 'Suggested: 0'"
  - "Dashed-border badge: className='border-2 border-dashed border-{color} bg-transparent text-{color}' applied alongside tier color token"

requirements-completed: [DASH-01, DASH-03, OBJ-01, OBJ-02, OBJ-03]

duration: 30min
completed: 2026-03-26
---

# Phase 07-02: Dashboard KPI Suggested Counts + ObjectTable Dashed Badge Summary

**KPICard `suggestedCount` prop, Dashboard wiring, and dashed computed-tier badge in ObjectTable**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-03-26
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added optional `suggestedCount?: number` prop to `KPICard.tsx` — renders `"Suggested: N"` in muted text between the applied count and PIM mini-stats when provided
- Updated `Dashboard.tsx` to pass `suggestedCount={data.suggestedTiers[tier]}` in the `TIER_ORDER.map()` loop — all three tier cards now show the suggested count from the API; Unclassified card receives no prop
- Updated `ObjectTable.tsx` to call `computedTierName(object.Classification)` for Unclassified objects — when non-null, renders a `border-dashed` badge in the computed tier's colour; empty `Classification[]` continues to render plain grey badge

## Task Commits

1. **Task 1+2: KPICard suggestedCount + Dashboard wiring** — `73ce63a` (feat)
2. **Task 3: ObjectTable dashed badge** — `e888bcb` (feat)

## Human Verification

Checkpoint approved by user on 2026-03-26.

All `must_haves` truths confirmed:
- ✓ Each tier KPI card (ControlPlane, ManagementPlane, UserAccess) shows "Suggested: N"
- ✓ Unclassified KPI card shows no Suggested line
- ✓ Unclassified objects with non-empty Classification[] show dashed-border tier-coloured badge
- ✓ Unclassified objects with empty Classification[] show solid grey badge (unchanged)
- ✓ Applied-tier objects show existing solid badges (no change)
