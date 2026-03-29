# Phase 07: Computed Tier Surfaces - Research

**Researched:** 2026-03-26
**Domain:** TypeScript / Express / React — data derivation, API contract extension, TanStack Table cell rendering, Tailwind v4 badge styling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard KPI card layout**
- Add a single small "Suggested: N" line inside each existing tier KPI card, between the big Applied count and the Permanent/Eligible PIM stats
- No new card rows, no layout restructuring
- Applied count = existing big number (28px) — unchanged
- Suggested count = small secondary line, e.g. `Suggested: 12`
- Show Suggested on all three tier cards (Control Plane, Management Plane, Workload Plane) always — even when Suggested === Applied
- Unclassified card: no Suggested line added

**Suggested count population**
- Suggested count per tier card = count of all objects whose computed lowest `AdminTierLevel` number in `Classification[]` resolves to that tier — regardless of current `ObjectAdminTierLevelName`
- Computed tier = `Math.min(...Classification[].map(c => c.AdminTierLevel))` → mapped to tier name  *(see Pitfall 1 — this must filter NaN values)*
- Objects with empty `Classification[]` contribute 0 to all Suggested counts
- Unclassified card count = all objects where `ObjectAdminTierLevelName` is null / unclassified — unchanged
- No Suggested line on the Unclassified card

**Computed tier badge in Object Browser**
- For Unclassified objects that have at least one `Classification[]` entry (with a non-Unclassified AdminTierLevel), replace solid grey "Unclassified" badge with dashed-border badge colored by the computed tier, showing just the tier name
- Objects with an applied tier: no change
- Badge variants: `solid` (existing) and `dashed` (new) — same tier color token, dashed border via CSS
- Badge label = tier name only, no "Suggested:" prefix
- Only shown when `ObjectAdminTierLevelName` is null/unclassified AND `Classification[]` has at least one non-Unclassified entry

**Unclassified objects with no Classification[] entries**
- Solid grey "Unclassified" badge — unchanged
- No tooltip, no extra filter facet

### Claude's Discretion

None specified — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)

- D2: Filtering Object Browser by "has suggestion" vs "no suggestion" — deferred post-Phase 7
- D4: Tooltip on solid grey badge explaining why no suggestion exists — deferred
- Per-tier drill-down comparing Applied vs Suggested populations — Phase 8 territory
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Dashboard displays both applied tier counts and computed tier counts side-by-side per tier | Server: add `suggestedTiers` to `DashboardResponse`; Client: `KPICard` renders `suggestedCount` |
| DASH-02 | Computed tier is derived from the lowest `AdminTierLevel` number in an object's `Classification[]` array | `computedTierName()` shared util using min of numeric AdminTierLevel values with NaN guard |
| DASH-03 | Dashboard visually distinguishes applied vs. computed counts with clear "Applied" / "Suggested" labels | KPICard layout: big number = Applied, secondary line = "Suggested: N" |
| OBJ-01 | When `ObjectAdminTierLevelName` is "Unclassified", the Tier column shows the computed tier instead | ObjectTable cell renderer switches badge variant based on computed tier from `row.original.Classification` |
| OBJ-02 | Computed tier badge is visually distinct from an applied tier (dashed outline style) | `border-dashed` Tailwind utility added to badge className — no custom CSS needed |
| OBJ-03 | When an applied tier is set, existing Tier column behaviour is unchanged | Cell renderer short-circuits early if `ObjectAdminTierLevelName !== 'Unclassified'` |
</phase_requirements>

---

## Summary

Phase 7 is a **pure data derivation and presentation phase** — no new library dependencies, no new route endpoints, no new page. Every change is an extension of existing code: the dashboard route gets an additional aggregate, the API type gets a new field, the KPICard component gets a new optional prop, and the ObjectTable tier cell renderer gains a conditional branch.

The critical correctness constraint is the `computedTier` implementation. Real `PrivilegedEAM/` data contains `Classification[]` entries where `AdminTierLevel` is the string `'Unclassified'` (not a number). This means `parseInt('Unclassified', 10)` returns `NaN`, and `Math.min(NaN, ...)` returns `NaN` — silently producing wrong counts if not guarded. The canonical function in CONTEXT.md works at runtime in JS only when no entry has `AdminTierLevel: 'Unclassified'`, but the actual data proves such entries exist.

The safest approach is a shared utility function in `gui/shared/utils/tier.ts` that filters `'Unclassified'` AdminTierLevel values before computing the minimum. Both `dashboard.ts` (server-side aggregate) and `ObjectTable.tsx` (client-side badge) will import the same logic, ensuring consistency.

**Primary recommendation:** Create `gui/shared/utils/tier.ts` with a `computedTierName()` function. Use it in `dashboard.ts` for suggested counts and in `ObjectTable.tsx`'s tier cell renderer for the dashed badge.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | Project default | Type-safe shared utility | Already the project language |
| Express v5 | Project default | Server route for dashboard | Already in use |
| React + TanStack Table | Project default | ObjectTable column cell rendering | Already in use |
| Tailwind v4 | Project default | `border-dashed` for dashed badge | Already configured |
| shadcn/ui `Badge` | Project default | Tier badge component | Already rendering tier badges |

### No New Packages Required

All required capabilities exist in the installed stack. This is a data flow and styling phase.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
gui/
├── shared/
│   ├── types/           # existing
│   └── utils/           # NEW directory
│       └── tier.ts      # computedTierName() — used by server + client
├── server/
│   └── routes/
│       └── dashboard.ts # add suggestedTiers computation loop
└── client/src/
    ├── components/
    │   └── dashboard/
    │       └── KPICard.tsx         # add suggestedCount prop
    └── components/objects/
        └── ObjectTable.tsx         # dashed badge in tier cell renderer
```

And update `gui/shared/types/api.ts` (add `SuggestedTierCounts` + `suggestedTiers` field on `DashboardResponse`).

### Pattern 1: Shared computed utility (server + client)

**What:** A pure function in `gui/shared/utils/tier.ts` that computes the suggested tier name from a `PrivilegedObject`. Both server and client import from the same module.

**When to use:** Whenever both sides need identical derivation logic over a shared type.

**Example:**
```typescript
// gui/shared/utils/tier.ts
import type { PrivilegedObject, EamTier } from '../types/eam.js';

const TIER_PRECEDENCE: Partial<Record<EamTier, number>> = {
  ControlPlane: 0,
  ManagementPlane: 1,
  UserAccess: 2,
};

/**
 * Returns the highest-risk (lowest AdminTierLevel number) non-Unclassified
 * tier name from the object's Classification array, or null if none exist.
 *
 * Uses AdminTierLevelName directly — avoids parseInt('Unclassified') = NaN trap.
 */
export function computedTierName(
  obj: Pick<PrivilegedObject, 'Classification'>
): Exclude<EamTier, 'Unclassified'> | null {
  if (!obj.Classification?.length) return null;
  let best: Exclude<EamTier, 'Unclassified'> | null = null;
  for (const c of obj.Classification) {
    if (c.AdminTierLevelName === 'Unclassified') continue;
    if (
      best === null ||
      (TIER_PRECEDENCE[c.AdminTierLevelName] ?? 99) < (TIER_PRECEDENCE[best] ?? 99)
    ) {
      best = c.AdminTierLevelName as Exclude<EamTier, 'Unclassified'>;
    }
  }
  return best;
}
```

> **Why `AdminTierLevelName` instead of `parseInt(AdminTierLevel)`?** See Pitfall 1.

### Pattern 2: Dashboard route aggregate loop extension

**What:** Add a `suggestedTiers` counts object computed in the same `for (const obj of allObjects)` loop that already computes `tiers`, `objectTypes`, and `pimTypes`.

**When to use:** Whenever a new aggregate can be derived from the same single-pass object iteration.

**Example:**
```typescript
// In dashboard.ts — inside the existing for (const obj of allObjects) loop
const suggestedTiers: SuggestedTierCounts = {
  ControlPlane: 0, ManagementPlane: 0, UserAccess: 0
};

// … inside loop:
const suggested = computedTierName(obj);
if (suggested && suggested in suggestedTiers) {
  suggestedTiers[suggested as keyof SuggestedTierCounts] += 1;
}
```

### Pattern 3: TanStack Table cell renderer — conditional dashed badge

**What:** The `ObjectAdminTierLevelName` column cell already uses `getValue()` (accessor). To get the full object (for `Classification[]`), switch to `cell({ row })` and access `row.original`.

**When to use:** When a cell's display depends on multiple fields of the same row.

**Example:**
```typescript
// In ObjectTable.tsx — tier column cell renderer
{
  accessorKey: 'ObjectAdminTierLevelName',
  header: 'Tier',
  cell: ({ row }) => {
    const tier = row.original.ObjectAdminTierLevelName;
    const isUnclassified = tier === 'Unclassified';
    const computed = isUnclassified ? computedTierName(row.original) : null;

    if (isUnclassified && computed) {
      // Dashed badge: same color as solid, but border-dashed
      return (
        <Badge
          variant="outline"
          className={cn('text-xs font-medium border-dashed', TIER_BADGE_CLASS[computed])}
        >
          {computed}
        </Badge>
      );
    }

    // Solid badge: existing behavior
    return (
      <Badge
        variant="outline"
        className={cn('text-xs font-medium', TIER_BADGE_CLASS[tier] ?? '')}
      >
        {tier}
      </Badge>
    );
  },
},
```

### Pattern 4: API contract extension — additive field

**What:** Add `suggestedTiers: SuggestedTierCounts` to `DashboardResponse`. The `EMPTY_RESPONSE` constant in `dashboard.ts` must also get `suggestedTiers: { ControlPlane: 0, ManagementPlane: 0, UserAccess: 0 }`.

**When to use:** Extending an existing API response shape — always additive, never remove/rename.

**Example (api.ts):**
```typescript
// New type — mirrors TierCounts but excludes Unclassified (no Suggested Unclassified)
export interface SuggestedTierCounts {
  ControlPlane: number;
  ManagementPlane: number;
  UserAccess: number;
}

// Updated DashboardResponse
export interface DashboardResponse {
  hasData: boolean;
  tiers: TierCounts;
  suggestedTiers: SuggestedTierCounts;   // NEW
  objectTypes: Record<string, number>;
  rbacBreakdown: RbacBreakdown[];
  pimTypes: TierPimCounts;
  freshness: string | null;
  recentCommits: GitCommit[];
}
```

### Pattern 5: KPICard prop extension

**What:** Add an optional `suggestedCount` prop to `KPICard`. Render it as a secondary text line between the big count and the PIM mini-stats.

```typescript
interface KPICardProps {
  tier: keyof typeof TIER_STYLES;
  count: number;
  permanentCount: number;
  eligibleCount: number;
  suggestedCount?: number;  // NEW — optional; not shown on Unclassified card (caller omits it)
}
```

### Anti-Patterns to Avoid

- **`cell: ({ getValue }) =>`** for the dashed badge: `getValue()` only returns the accessor key's value — no access to `Classification[]`. Must use `cell: ({ row }) =>` instead.
- **Hardcoded tier→level map**: Don't build a separate `{ ControlPlane: 0, ManagementPlane: 1, UserAccess: 2 }` map in both server and client. Put it once in `tier.ts`.
- **Modifying `EMPTY_RESPONSE` without `suggestedTiers`**: TypeScript will catch this at build time if `DashboardResponse` is updated first (it should be) — do not add the field without zero-filling `EMPTY_RESPONSE`.
- **Using parseInt without NaN guard**: `parseInt('Unclassified', 10)` = NaN. See Pitfall 1.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashed border badge | Custom `<DashedBadge>` component | `className="border-dashed"` on existing `<Badge variant="outline">` | Tailwind `border-dashed` is a single utility class; the existing Badge already takes className |
| Tier precedence comparison | Custom tier sort logic | `TIER_PRECEDENCE` map in shared `tier.ts` | One record object + comparison is sufficient; no sorting library needed |
| Dashboard suggested counts | New `/api/suggested` endpoint | Add `suggestedTiers` field to existing `/api/dashboard` response | One aggregate pass; no extra HTTP round-trip; simpler client data flow |

---

## Common Pitfalls

### Pitfall 1: `AdminTierLevel: 'Unclassified'` causes NaN in Math.min

**What goes wrong:** The CONTEXT.md canonical function uses `Math.min(...obj.Classification.map(c => c.AdminTierLevel))`. In real `PrivilegedEAM/EntraID/EntraID.json` data, Classification entries include `{ "AdminTierLevel": "Unclassified", "AdminTierLevelName": "Unclassified" }`. `parseInt('Unclassified', 10)` = `NaN`. `Math.min(NaN, 0, 1)` = `NaN`. Suggested counts for all tiers will be 0 (or all objects will silently fall through), even for objects with real tier suggestions.

**Why it happens:** The typed field `Classification.AdminTierLevel` is `string`, so valid values include both numeric strings (`'0'`, `'1'`, `'2'`) and the literal string `'Unclassified'`. This is confirmed by live data inspection of `EntraID.json`.

**How to avoid:** Use `AdminTierLevelName !== 'Unclassified'` as the filter condition (safer than parseInt), OR filter NaN after parseIntusing `.filter(n => !isNaN(n))`. The recommended shared util uses `AdminTierLevelName` directly — no parseInt at all.

**Warning signs:** Suggested counts showing 0 for all tiers despite objects having Classification entries; or computed tier always returning null.

### Pitfall 2: `getValue()` vs `row.original` in TanStack column cell

**What goes wrong:** The current tier cell uses `cell: ({ getValue }) =>` which returns only `ObjectAdminTierLevelName`. `Classification[]` is not accessible via `getValue()`. If you try to call `computedTierName` with only the tier string, you get a type error.

**Why it happens:** `getValue()` is a shortcut for the column's `accessorKey` value — it doesn't expose the full row.

**How to avoid:** Switch to `cell: ({ row }) =>` and use `row.original` (typed as `PrivilegedObject`) to access `row.original.Classification`.

**Warning signs:** TypeScript error "Property 'Classification' does not exist on type 'string'" when trying to call computedTierName.

### Pitfall 3: KPICard rendered for Unclassified tier

**What goes wrong:** Dashboard renders `TIER_ORDER = ['ControlPlane', 'ManagementPlane', 'UserAccess']` — the Unclassified card is rendered separately (not in this array). If `suggestedCount` is accidentally passed to an Unclassified card (e.g., via `data.suggestedTiers` indexing), it would show a misleading "Suggested" line.

**Why it happens:** The caller (`Dashboard.tsx`) maps over `TIER_ORDER` and must only pass `suggestedCount` for the three classified tiers.

**How to avoid:** Make `suggestedCount` optional on `KPICard` and rely on the caller not passing it for Unclassified. Since Unclassified is currently not rendered in the TIER_ORDER loop (it uses a separate section or is absent), this is safe — just confirm Unclassified card location in Dashboard.tsx before wiring.

### Pitfall 4: `EMPTY_RESPONSE` missing `suggestedTiers`

**What goes wrong:** `dashboard.ts` has a module-level `EMPTY_RESPONSE` constant. Adding `suggestedTiers` to `DashboardResponse` in api.ts causes TypeScript error on `EMPTY_RESPONSE` if the field isn't added there too.

**Why it happens:** Additive API changes must be applied to ALL usages of the type — both the runtime response builder and the empty/fallback constant.

**How to avoid:** Update `EMPTY_RESPONSE` in the same edit that adds `suggestedTiers` to `DashboardResponse`.

### Pitfall 5: Column definition declared outside component — accessing computedTierName

**What goes wrong:** `const columns: ColumnDef<PrivilegedObject>[]` is declared at module scope in `ObjectTable.tsx`. If `computedTierName` is imported at the top of the file and used inside the cell renderer, this works fine. But if `computedTierName` is defined inside the component (accidentally), column defs will be recreated on every render.

**Why it happens:** Developers sometimes move utility functions into component scope for convenience.

**How to avoid:** Import `computedTierName` from `gui/shared/utils/tier.ts` at the top of `ObjectTable.tsx`. Keep `columns` as a module-level constant.

---

## Code Examples

### computedTierName (shared utility — canonical implementation)

```typescript
// gui/shared/utils/tier.ts
// Source: derived from CONTEXT.md canonical, hardened against real data

import type { PrivilegedObject, EamTier } from '../types/eam.js';

const TIER_PRECEDENCE: Partial<Record<EamTier, number>> = {
  ControlPlane: 0,
  ManagementPlane: 1,
  UserAccess: 2,
};

export function computedTierName(
  obj: Pick<PrivilegedObject, 'Classification'>
): Exclude<EamTier, 'Unclassified'> | null {
  if (!obj.Classification?.length) return null;
  let best: Exclude<EamTier, 'Unclassified'> | null = null;
  for (const c of obj.Classification) {
    if (c.AdminTierLevelName === 'Unclassified') continue;
    if (
      best === null ||
      (TIER_PRECEDENCE[c.AdminTierLevelName] ?? 99) < (TIER_PRECEDENCE[best] ?? 99)
    ) {
      best = c.AdminTierLevelName as Exclude<EamTier, 'Unclassified'>;
    }
  }
  return best;
}
```

### dashboard.ts — suggested tier aggregation

```typescript
// Import at top
import { computedTierName } from '../../shared/utils/tier.js';

// Inside router.get('/') — after allObjects is populated:
const suggestedTiers: SuggestedTierCounts = {
  ControlPlane: 0, ManagementPlane: 0, UserAccess: 0
};

for (const obj of allObjects) {
  // ... existing tiers, pimTypes, rbacBreakdown logic unchanged ...

  const suggested = computedTierName(obj);
  if (suggested !== null) {
    suggestedTiers[suggested] += 1;
  }
}

// Then include in response:
const response: DashboardResponse = {
  hasData: true,
  tiers,
  suggestedTiers,   // NEW
  objectTypes,
  rbacBreakdown,
  pimTypes,
  freshness,
  recentCommits,
};
```

### KPICard.tsx — Suggested line

```tsx
// Updated interface
interface KPICardProps {
  tier: keyof typeof TIER_STYLES;
  count: number;
  permanentCount: number;
  eligibleCount: number;
  suggestedCount?: number;  // NEW — undefined = no Suggested line rendered
}

// Inside CardContent, between the big count div and the PIM block:
{suggestedCount !== undefined && (
  <div className="text-xs text-muted-foreground mb-2">
    Suggested: <span className="font-medium text-foreground">{suggestedCount.toLocaleString()}</span>
  </div>
)}
```

### Dashboard.tsx — passing suggestedCount to KPICard

```tsx
// TIER_ORDER stays the same: ['ControlPlane', 'ManagementPlane', 'UserAccess']
{TIER_ORDER.map(tier => (
  <KPICard
    key={tier}
    tier={tier}
    count={data.tiers[tier]}
    permanentCount={data.pimTypes[tier].Permanent}
    eligibleCount={data.pimTypes[tier].Eligible}
    suggestedCount={data.suggestedTiers[tier]}  // NEW
  />
))}
```

### ObjectTable.tsx — dashed badge cell renderer

```tsx
// Import at top of file
import { computedTierName } from '../../../../shared/utils/tier';

// Updated tier column:
{
  accessorKey: 'ObjectAdminTierLevelName',
  header: 'Tier',
  cell: ({ row }) => {
    const tier = row.original.ObjectAdminTierLevelName;
    if (tier === 'Unclassified') {
      const computed = computedTierName(row.original);
      if (computed) {
        return (
          <Badge
            variant="outline"
            className={cn('text-xs font-medium border-dashed', TIER_BADGE_CLASS[computed])}
          >
            {computed}
          </Badge>
        );
      }
      // Fall through to solid grey Unclassified badge
    }
    return (
      <Badge
        variant="outline"
        className={cn('text-xs font-medium', TIER_BADGE_CLASS[tier] ?? '')}
      >
        {tier}
      </Badge>
    );
  },
},
```

---

## Runtime State Inventory

> Step 2.5: SKIPPED — this is a greenfield feature addition (new computed fields and styling), not a rename/refactor/migration phase. No runtime state, stored data, or OS-registered entries are affected.

---

## Environment Availability

> Step 2.6: SKIPPED — no external dependencies beyond the project's own installed stack. All required tools (TypeScript, Node.js, Vite, Express) are confirmed working (Phase 6 shipped).

---

## Validation Architecture

> No project test infrastructure found (`find gui -name "*.test.*" -not -path "*/node_modules/*"` returns nothing). Manual browser verification is the validation approach.

### Phase Requirements → Verification Map

| Req ID | Behavior | Test Type | Verification |
|--------|----------|-----------|--------------|
| DASH-01 | Dashboard shows Applied + Suggested counts per tier | Manual | Open dashboard with EAM data; confirm "Suggested: N" appears in each of 3 tier cards |
| DASH-02 | Suggested = min AdminTierLevel from Classification[] | Manual + unit-testable | Inspect EntraID objects: "365 Admin" has min level 0 (ControlPlane) — ControlPlane Suggested should increment |
| DASH-03 | "Applied" (big number) vs "Suggested: N" (small line) visually distinct | Manual | Applied = 28px bold, Suggested = small muted label |
| OBJ-01 | Unclassified + has Classification[] → shows computed tier name | Manual | "365 Admin" (Unclassified, min level = 0) should show "ControlPlane" in Tier column |
| OBJ-02 | Computed tier badge has dashed border | Manual | Badge outline is visually dashed, same color as solid equivalent |
| OBJ-03 | Applied tier objects unchanged | Manual | Any non-Unclassified object shows solid badge, same as pre-Phase 7 |

### Wave 0 Gaps
- None — no test files needed; verification is manual browser testing against live `PrivilegedEAM/` data

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `getValue()` for multi-field cell logic | `cell: ({ row }) =>` + `row.original` | TanStack Table v8 pattern — needed for this phase |
| Separate badge component | `className` prop composition with Tailwind utilities | shadcn Badge + `border-dashed` is sufficient |

---

## Open Questions

1. **Import path for shared utils in ObjectTable.tsx**
   - What we know: Client imports shared types via relative path `../../../../shared/types/eam` (confirmed in ObjectTable.tsx)
   - What's required: The new `gui/shared/utils/tier.ts` follows the same pattern — import as `../../../../shared/utils/tier`
   - Recommendation: Verify `gui/client/tsconfig.json` `include` covers `../../shared/**` (check `tsconfig.json` at `gui/client/`) before assuming relative imports work. If not, the path alias `@/*` won't cover shared — use relative path directly.

2. **`Exclude<EamTier, 'Unclassified'>` in TypeScript**
   - What we know: `EamTier = 'ControlPlane' | 'ManagementPlane' | 'UserAccess' | 'Unclassified'`
   - The return type of `computedTierName` should exclude `'Unclassified'` to make callers type-safe
   - Recommendation: Use `Exclude<EamTier, 'Unclassified'>` as the return type. TypeScript handles this correctly.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `gui/server/routes/dashboard.ts`, `gui/shared/types/eam.ts`, `gui/shared/types/api.ts`, `gui/client/src/components/dashboard/KPICard.tsx`, `gui/client/src/components/objects/ObjectTable.tsx`, `gui/client/src/globals.css`
- Live data inspection: `/PrivilegedEAM/EntraID/EntraID.json` — confirmed `AdminTierLevel: 'Unclassified'` exists in real Classification entries
- CONTEXT.md locked decisions — all locked, no alternatives researched

### Secondary (MEDIUM confidence)
- TanStack Table v8 `cell: ({ row })` access pattern — standard documented API, confirmed used in existing codebase (`cell: ({ getValue })` variant is live)
- Tailwind v4 `border-dashed` utility — standard CSS utility, present in Tailwind v4

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing
- Architecture: HIGH — all patterns derived from existing codebase code
- Pitfalls: HIGH — Pitfall 1 confirmed by live data inspection; others confirmed by TypeScript type analysis

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable domain — unlikely to change)
