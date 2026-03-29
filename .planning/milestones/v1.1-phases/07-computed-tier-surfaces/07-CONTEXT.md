# Phase 7 Context: Computed Tier Surfaces

**Goal:** Security admins can see, side-by-side, how many objects are applied to each tier vs. how many the engine suggests — and unclassified objects in the Object Browser show their computed tier rather than a blank badge.

---

## Decision: Dashboard KPI card layout

**Decision:** Add a single small "Suggested: N" line inside each existing tier KPI card, sitting between the big Applied count and the Permanent/Eligible PIM stats. No new card rows, no layout restructuring.

**Rationale:** Simplicity. The existing card structure (big number → sub-stats) extends naturally. Applied stays prominent (it's ground truth); Suggested is secondary and always visible — no conditional show/hide logic.

**Implementation notes:**
- Applied count = existing big number (28px) — unchanged
- Suggested count = small secondary line, e.g. `Suggested: 12`, between the big number and the PIM mini-stats
- Show Suggested on all three tier cards (Control Plane, Management Plane, Workload Plane) always — even when Suggested === Applied
- Unclassified card: no Suggested line added

---

## Decision: Suggested count population

**Decision:** Suggested count per tier card = count of all objects whose computed lowest `AdminTierLevel` number in `Classification[]` resolves to that tier — regardless of their current `ObjectAdminTierLevelName` (Applied tier). Includes currently-Unclassified objects that have suggestions.

**Rationale:** Applied = current state, Suggested = target state. Different populations is correct and useful. The Unclassified card stays as-is (counts all unclassified objects, with and without suggestions) — "Suggested Unclassified" is a contradiction in terms.

**Implementation notes:**
- Computed tier = `Math.min(...Classification[].map(c => c.AdminTierLevel))` → mapped to tier name
- Objects with empty `Classification[]` contribute 0 to all Suggested counts
- Unclassified card count = all objects where `ObjectAdminTierLevelName` is null / unclassified — unchanged from current logic
- No Suggested line on the Unclassified card

---

## Decision: Computed tier badge in Object Browser

**Decision:** For Unclassified objects that have at least one `Classification[]` entry, replace the solid grey "Unclassified" badge with a dashed-border badge colored by the computed tier, showing just the tier name (e.g. "Control Plane"). Objects with an applied tier: no change.

**Rationale:** Single badge per cell avoids clutter. Dashed border carries the "unconfirmed" meaning without needing a label prefix. Tier color preserved so users can scan by tier across classified and unclassified objects consistently.

**Implementation notes:**
- Badge variants: `solid` (existing, for applied-tier objects) and `dashed` (new, for computed-tier-only objects)
- Dashed badge uses the same tier color token as the solid badge for that tier
- Badge label = tier name only, no "Suggested:" prefix
- Only shown when `ObjectAdminTierLevelName` is null/unclassified AND `Classification[]` is non-empty

---

## Decision: Unclassified objects with no Classification[] entries

**Decision:** Solid grey "Unclassified" badge is unchanged for objects with empty `Classification[]`. No separate filter, no tooltip. The visual distinction (solid grey vs. dashed tier-colored) implicitly communicates "no suggestion available" vs. "suggestion exists."

**Rationale:** Simplicity. Two badge variants are enough. Adding a third state, filter options, or tooltips adds complexity with low user value at this stage.

**Implementation notes:**
- Solid grey "Unclassified" badge = objects with null/unclassified `ObjectAdminTierLevelName` AND empty `Classification[]`
- No additional filter facet for "Unclassified – no suggestion"
- No tooltip on the solid grey badge

---

## Code Context

**Relevant types:**
- `gui/shared/types/eam.ts` — `PrivilegedObject.ObjectAdminTierLevelName` (applied tier), `PrivilegedObject.Classification[]` with `AdminTierLevel: number` (computed tier source)

**Relevant components:**
- `gui/client/src/` — KPI card component (currently shows big number + Permanent/Eligible stats)
- `gui/client/src/` — Object Browser tier badge component (currently solid colored badge)
- `gui/server/routes/dashboard.ts` — dashboard API endpoint (will need Suggested counts added to response)

**Computed tier logic (canonical):**
```ts
function computedTier(obj: PrivilegedObject): number | null {
  if (!obj.Classification || obj.Classification.length === 0) return null;
  return Math.min(...obj.Classification.map(c => c.AdminTierLevel));
}
```

---

## Deferred Ideas

- Filtering Object Browser by "has suggestion" vs "no suggestion" — D2, deferred post-Phase 7
- Tooltip on solid grey badge explaining why no suggestion exists — D4, deferred
- Per-tier drill-down comparing Applied vs Suggested populations — Phase 8 territory
