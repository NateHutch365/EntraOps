# Phase 8 Context: Object Reclassification Screen

**Goal:** Admins can navigate to a dedicated reclassification screen, review all objects' applied and computed tiers side-by-side, override individual object tier assignments inline, and save changes back to a classification overrides file.

**Requirements:** RECL-01, RECL-02, RECL-03, RECL-04, RECL-05

---

## Decision: Override persistence format and file

**Decision:** Overrides are stored in a new `Classification/Overrides.json` file. The file contains an array of override objects keyed by `ObjectId`. Format:

```json
[
  {
    "ObjectId": "aaaa-bbbb-cccc",
    "OverrideTierLevelName": "ControlPlane"
  }
]
```

**Rationale:** One file, clear purpose, identical pattern to existing `Classification/Global.json` (array of objects). No database, no hidden config. Easily inspectable and git-trackable.

**Implementation notes:**
- File lives at `Classification/Overrides.json` (same dir as `Global.json`)
- File is created on first save if it doesn't exist
- Valid `OverrideTierLevelName` values: `"ControlPlane"`, `"ManagementPlane"`, `"UserAccess"` — validated with Zod before write
- Write uses existing `atomicWrite()` utility (temp → rename pattern) — same as templates route
- Path safety validated with `assertSafePath()` from existing middleware

---

## Decision: Server API — new overrides endpoints only

**Decision:** The reclassification screen reuses the existing `/api/objects` endpoint for its object list. Two new endpoints are added:

- `GET /api/overrides` — returns current `Overrides.json` contents as `{ overrides: Override[] }`
- `POST /api/overrides` — accepts `{ overrides: Override[] }`, Zod-validates, atomicWrites file, returns `{ ok: true }`

**Rationale:** `/api/objects` already handles pagination, filtering, and large tenants server-side. No reason to duplicate. Overrides are a small separate concern — simple read/write endpoints are sufficient.

**Implementation notes:**
- New `gui/server/routes/overrides.ts` router, registered at `/api/overrides` in `server/index.ts`
- `GET /api/overrides` returns `{ overrides: [] }` if file is missing (no error)
- `POST /api/overrides` validates with Zod schema, writes atomically — returns 400 on invalid payload
- No partial-update endpoint — client always POSTs the full overrides array (simple, no conflict logic)
- New shared type `Override` added to `shared/types/api.ts`

---

## Decision: Inline override control — Select dropdown + amber row highlight

**Decision:** Each row has a shadcn `Select` component showing the three tier options (Control Plane / Management Plane / User Access). An additional "—" / "No override" option clears a prior override. Rows with a pending (unsaved) change get an amber background (`bg-amber-500/10` or similar Tailwind token). A sticky header bar above the table shows "Save All" (primary) and "Discard" (ghost) buttons, enabled only when there are pending changes.

**Rationale:** Dropdown is the simplest single-interaction override. Amber row highlight gives clear "you have unsaved work" feedback. Single Save All + Discard pair avoids per-row save complexity.

**Implementation notes:**
- Select options: `"ControlPlane"` → "Control Plane", `"ManagementPlane"` → "Management Plane", `"UserAccess"` → "User Access", `""` / null → "— No override"
- Pending state tracked in React `useState` as a `Map<ObjectId, OverrideTierLevelName | null>` — null means "clear existing override"
- Row highlight applies only when pending !== persisted value for that ObjectId
- "Save All" button calls `POST /api/overrides` with merged pending + persisted overrides (nulls removed), then invalidates the overrides query cache
- "Discard" resets pending map to empty without a server call
- Pending count shown in button label: "Save All (3)" when 3 rows are dirty

---

## Decision: Save semantics — display-layer pin only, stale overrides silently ignored

**Decision:** Overrides are display-layer only. They are stored in `Classification/Overrides.json` and surfaced in the GUI — they do NOT feed back into the EntraOps PowerShell classification engine. If an `ObjectId` in `Overrides.json` no longer appears in any `PrivilegedEAM/` file, that override is silently ignored (not shown, not errored).

**Rationale:** Feeding overrides into the classification engine requires PowerShell module changes — out of scope for v1.1. Silently ignoring stale overrides is the simplest approach; no "stale override" warning UI to build or explain.

**Implementation notes:**
- `GET /api/overrides` returns all stored overrides; the client merges with the objects list and only shows overrides that match a loaded `ObjectId`
- Overrides with no matching object are kept in `Overrides.json` (not pruned server-side) — they just don't render
- No toast/warning when stale overrides are detected
- The Reclassification page does not show a "this override will take effect after next run" message — overrides are a GUI-layer label only

---

## Decision: Where computed tier comes from on the reclassification screen

**Decision:** The "Computed" column uses the same `computedTierName()` utility from `shared/utils/tier.ts` (already built in Phase 7). No new logic. The override column is separate from both Applied and Computed.

**Column layout per row:**
| Object | Applied Tier | Computed Tier | Override |
|-|-|-|-|
| Alice | Control Plane | Control Plane | Select ▾ |

**Rationale:** Reuse Phase 7 utility — zero new computation logic needed.

**Implementation notes:**
- `computedTierName()` is called client-side per object (data already includes `Classification[]`)
- Applied tier = `ObjectAdminTierLevelName` (same solid badge as Object Browser)
- Computed tier = `computedTierName(obj.Classification)` — shown as dashed badge (Phase 7 asset reused)
- Override column = shadcn Select; pre-populated with persisted override if one exists for this ObjectId

---

## Decision: Page entry point and nav label

**Decision:** New route `/reclassify`, registered in `App.tsx` and added to `Sidebar.tsx` NAV_ITEMS. Nav label: "Reclassify". Icon: `SlidersHorizontal` from lucide-react (already a dependency).

**Rationale:** Short nav label fits collapsed sidebar. `SlidersHorizontal` icon communicates "adjustment" clearly. Route name is distinct from `/objects`.

**Implementation notes:**
- `client/src/pages/ReclassifyPage.tsx` — new page component
- `App.tsx`: `<Route path="reclassify" element={<ReclassifyPage />} />`
- `Sidebar.tsx`: new NAV_ITEM `{ to: '/reclassify', icon: SlidersHorizontal, label: 'Reclassify', end: false }`
- Position in sidebar: between "Browse Objects" and "Templates" (logical grouping with object-related tools)

---

## Code Context

**Reusable assets from prior phases:**
- `shared/utils/tier.ts` → `computedTierName()` — Phase 7, use as-is
- `server/utils/atomicWrite.ts` — template route pattern for safe file writes
- `server/middleware/security.ts` → `assertSafePath()` — path validation
- `client/src/components/objects/ObjectTable.tsx` — tier badge rendering (dashed badge from Phase 7)
- `shared/types/eam.ts` → `PrivilegedObject`, `EamTier`, `Classification` — no changes needed

**New files to create:**
- `server/routes/overrides.ts` — GET + POST handlers
- `client/src/pages/ReclassifyPage.tsx` — page component
- `client/src/hooks/useOverrides.ts` — TanStack Query hook for GET/POST overrides

**New shared type (add to `shared/types/api.ts`):**
```ts
export interface Override {
  ObjectId: string;
  OverrideTierLevelName: 'ControlPlane' | 'ManagementPlane' | 'UserAccess';
}
```

**Overrides file path:**
```
Classification/Overrides.json
```

---

## Deferred Ideas

- Feeding overrides into the EntraOps PowerShell classification engine — post-v1.1 PowerShell module work
- Filtering the reclassification list by "has override" / "applied ≠ computed" — D1, deferred
- Bulk-select and apply tier to multiple objects at once — D2, deferred
- Warning toast when a loaded Overrides.json contains stale ObjectIds — D3, deferred
