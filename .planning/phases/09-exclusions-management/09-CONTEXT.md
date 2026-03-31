# Phase 9: Exclusions Management — Context

**Gathered:** 2026-03-31 (updated 2026-03-31 — full discuss-phase run)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 delivers: admins can manage `Global.json` exclusions entirely from the browser — a dedicated Exclusions page (sidebar-navigable) that lists every excluded object with resolved display name, and allows removing any exclusion (persisted atomically to `Global.json`). No terminal or JSON file editing required.

**Requirements in scope:** EXCL-01, EXCL-02, EXCL-03
**Depends on:** Phase 8 (sidebar nav and page layout patterns)
**Feeds into:** Phase 10 (inline Exclude actions — adds the add-path from Object Browser and Reclassify screens)

</domain>

<decisions>
## Implementation Decisions

### Remove Interaction (Area A)

- **D-01:** Removes are **immediate** — single click on the Remove button, no staging (no amber-row / Save All pattern like ReclassifyPage). The exclusion list is recoverable by re-running classification; accidental removal cost is low.
- **D-02:** **No confirmation dialog.** Dialogs add friction for a low-cost reversible action.
- **D-03:** After a successful remove, a brief **success toast** ("Exclusion removed") is shown via the existing `sonner` Toaster. No batch remove; each row is removed independently.
- **D-04:** After at least one remove in the current page session, a **persistent info banner** appears above the table: `"Classification data may be stale — run Save-EntraOpsPrivilegedEAMJson to update."` with a "Go to Command Runner" action link. Dismissible. Does **not** appear on initial load.

### Row Information Density (Area B)

- **D-05:** The table shows: **display name**, **object type** (User / Service Principal — rendered as an icon or small badge, no separate column), and a **Remove button**. No tier level column; no UPN column.
- **D-06:** The page header shows a **total count** ("N exclusions") as a subdued badge or count string. If any exclusions are unresolvable, a secondary count is also shown ("X unresolved").
- **D-07:** Show the **full GUID** in an Object ID column for all rows (not truncated). Each GUID cell may include a hover tooltip with copy-to-clipboard action.

### Unresolvable GUID Handling (Area C)

- **D-08:** Unresolvable GUIDs (GUID exists in `Global.json` but matches no object in any PrivilegedEAM scan) are **always shown in the table** — never hidden. Hiding them would leave orphan entries with no UI path to clean them up.
- **D-09:** Unresolvable rows show label **"Unknown object"** with the truncated GUID as secondary text (e.g. `550e8400…`). The row is visually de-emphasised (grayed out, no object-type icon). The full GUID is still shown in the Object ID column.
- **D-10:** Unresolvable entries are **removable** via the same single-click Remove action as resolved entries. Cleaning up stale GUIDs is a valid and desirable operation.
- **D-11:** "No match = stale" is the assumed interpretation. Pre-emptive exclusion of objects not yet in PrivilegedEAM is not a supported workflow in this UI.

### Sidebar Navigation (Area D)

- **D-12:** The Exclusions nav entry is inserted **after Reclassify** in the sidebar nav array: Dashboard → Browse Objects → Reclassify → **Exclusions** → Templates → Run Commands → Connect → History → Settings.
- **D-13:** Sidebar label: **"Exclusions"** (short, matches domain term, fits collapsed width).
- **D-14:** Icon: **`ShieldMinus`** from Lucide. Conveys "removing from protection scope"; distinct from all existing nav icons.

### GlobalExclusionsTab (Template Editor)

- **D-15:** The existing `GlobalExclusionsTab.tsx` in the Template Editor (Phase 2) is **simplified to read-only** as part of Phase 9. The raw UUID textarea editor is removed; the tab becomes a display-only view of the current exclusions list.
- **D-16:** The simplified tab adds a **"Manage in Exclusions page →"** link (navigates to `/exclusions`). It does not compete with the canonical Exclusions page for mutations.

### Page Subtitle & Workflow Link

- **D-17:** The page subtitle (below the "Exclusions" H1) reads: `"Objects excluded from EntraOps tier classification. Changes take effect on the next classification run."` with a **"Run Classification →"** link navigating to `/run`.

### Claude's Discretion

- Exact copy polish for info banner and subtitle — maintain project's neutral, instructional tone
- Hover delay and clipboard-copy UX for the GUID tooltip
- Alphabetical sort tie-breaking for `Unknown (GUID)` entries (sorts to bottom is fine)
- Name resolution strategy: scan `PrivilegedEAM/**/*.json` for `ObjectId` / `Id` fields to build a `Map<guid, { displayName, objectType }>` lookup at request time

</decisions>

<specifics>
## Specific Ideas

- Removes are immediate and toasted — no staging, no dialogs, no batch select
- Object type shown as icon or badge inline in the name cell (no separate column) — keeps table compact
- Info banner triggers only after a remove in the current session; not on initial load
- The unresolved count in the header is always visible when there are unresolvable entries (independent of the info banner)
- The GlobalExclusionsTab simplification is a "clean up in Phase 9" task — do not defer to Phase 10
- Run Classification link in subtitle navigates to `/run` (the Run Commands page)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Design Contract
- `.planning/phases/09-exclusions-management/09-UI-SPEC.md` — Full visual spec: layout, typography, color, component inventory, screen layout, table columns, sidebar nav, copywriting, interaction states, API shape (GET/DELETE), registry safety. **Primary spec for planning.** Decisions above override or extend where noted (full GUID column, info banner, subtitle link).

### Existing Exclusions Infrastructure
- `gui/server/routes/templates.ts` — `GET /api/templates/global` and `PUT /api/templates/global` already exist (Phase 2). The new `GET /api/exclusions` endpoint is a separate route with a richer response shape (displayName, tier). Do not modify the templates route.
- `gui/shared/types/templates.ts` — `GlobalFile` type: `[{ ExcludedPrincipalId: string[] }]`. Phase 9's `DELETE /api/exclusions/:guid` reads this structure.
- `gui/client/src/components/templates/GlobalExclusionsTab.tsx` — Tab to be simplified in Phase 9 (read-only + link to `/exclusions`).
- `Classification/Global.json` — Source of truth: `[0].ExcludedPrincipalId[]` array of UUID strings.

### Phase 8 Patterns (reuse for Phase 9)
- `gui/client/src/pages/ReclassifyPage.tsx` — Page layout pattern: `flex flex-col h-full`, header with H1 + subtitle, `Table` with skeleton/empty/error states. Phase 9 ExclusionsPage should follow this pattern.
- `gui/server/routes/overrides.ts` — Atomic write pattern (`atomicWrite` utility). Phase 9's DELETE handler must use the same `atomicWrite` utility.

### Shared Utilities
- `gui/server/utils/atomicWrite.ts` — Temp-file-then-rename atomic write utility. Required for all JSON mutation endpoints.
- `gui/server/middleware/security.ts` — `assertSafePath` middleware. Not needed for Global.json (fixed path), but reference for route security patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `atomicWrite` utility: used in `overrides.ts` and `templates.ts` — Phase 9 remove handler must use this for `Global.json` writes
- `parseBomJson` helper in `templates.ts`: handles BOM-prefixed JSON — reuse when reading `Global.json` in the new exclusions route
- `ReclassifyPage.tsx` layout pattern: `flex flex-col h-full` + shadow-less table with skeleton/empty/error states — copy for `ExclusionsPage.tsx`
- All required shadcn components already installed: `Table`, `Button`, `Badge`, `Skeleton` — no new installs needed
- `sonner` Toaster already established — reuse for remove success/error toasts

### Sidebar Integration Point
- `gui/client/src/components/layout/Sidebar.tsx` — `NAV_ITEMS` const array. Insert `{ to: '/exclusions', icon: ShieldMinus, label: 'Exclusions', end: false }` after the Reclassify entry.
- `gui/client/src/App.tsx` — Add `<Route path="exclusions" element={<ExclusionsPage />} />` inside the `<AppShell />` route.

### Existing Exclusions Infrastructure
- `gui/server/routes/templates.ts` — `GET /api/templates/global` and `PUT /api/templates/global` already exist. The new `GET /api/exclusions` is a separate route with a richer response (`displayName`, `objectType`, `resolved`). Do **not** modify the templates route.
- `gui/shared/types/templates.ts` — `GlobalFile` shape: `[{ ExcludedPrincipalId: string[] }]`. Phase 9's DELETE/remove endpoint reads this structure.
- `gui/client/src/components/templates/GlobalExclusionsTab.tsx` — Simplify to read-only + link to `/exclusions` as part of Phase 9.
- `Classification/Global.json` — Source of truth: `[0].ExcludedPrincipalId[]` array of UUID strings.

### Name Resolution Strategy
- Scan `PrivilegedEAM/**/*.json` at request time for `GET /api/exclusions`
- Each PrivilegedEAM JSON object has `ObjectId` and `ObjectDisplayName` fields — build a `Map<guid, { displayName, objectType }>` lookup
- If a GUID from `ExcludedPrincipalId` is not found: return `displayName: null`, `objectType: null`, `resolved: false` — client renders "Unknown object" per D-09

</code_context>
