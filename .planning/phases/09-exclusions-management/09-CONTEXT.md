# Phase 9: Exclusions Management — Context

**Gathered:** 2026-03-31
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

### GlobalExclusionsTab (Template Editor)

- **D-01:** The existing `GlobalExclusionsTab.tsx` in the Template Editor (Phase 2) is **simplified to read-only** as part of Phase 9. The raw UUID textarea editor is removed; the tab becomes a display-only view of the current exclusions list.
- **D-02:** The simplified tab adds a **"Manage in Exclusions page →"** link (navigates to `/exclusions`). This keeps it as an escape-hatch reference point without competing with the canonical Exclusions page for mutations.
- **D-03:** The tab stays permanently — it is not removed in this phase or future phases. It serves as a read-only shortcut for admins who are already in the Template Editor.

### Object ID Column

- **D-04:** Show the **full GUID** in the Object ID column for all rows (not 8-char truncated). This overrides the UI-SPEC's truncation suggestion — the user explicitly wants full GUIDs visible at all times to aid identification.
- **D-05:** Each Object ID cell has a **hover tooltip** (not a persistent copy button) that surfaces the full GUID and may include a copy-to-clipboard action.

### Unresolvable GUIDs

- **D-06:** Unresolvable GUIDs (not found in any PrivilegedEAM JSON scan) are rendered **mixed in with resolved entries** — no separate grouping. Prioritise user simplicity; alphabetical sort by display name, with `Unknown (GUID)` treated as a display name for sort purposes (sorts to bottom naturally).
- **D-07:** The page header area shows a **count badge** indicating how many exclusions cannot be resolved (e.g., `X unresolved`). This gives at-a-glance awareness without cluttering rows.

### Post-Remove Re-classification Messaging

- **D-08:** The page **subtitle** (below the "Exclusions" H1) includes a note that Global.json changes take effect on the next `Save-EntraOpsPrivilegedEAMJson` run. Suggested copy: `"Objects excluded from EntraOps tier classification. Changes take effect on the next classification run."` with a **"Run Classification →"** link that navigates to the PowerShell Command Runner page (`/commands`).
- **D-09:** After a successful remove, an **info banner** appears at the top of the page content area (above the table): `"Classification data may be stale — run Save-EntraOpsPrivilegedEAMJson to update."` with a "Go to Command Runner" action link. The banner persists until the user navigates away or dismisses it.
- **D-10:** Each remove is independent — no session-level aggregate of "removed N this session" is tracked or displayed.

### Claude's Discretion

- Exact copy for the info banner and subtitle — keep consistent with the project's neutral, instructional tone
- Tooltip UX for Object ID (hover delay, whether to include a clipboard copy action)
- Alphabetical sort tie-breaking for `Unknown (GUID)` entries
- Route name resolution: scan `PrivilegedEAM/**/*.json` for `Id` / `ObjectId` GUID fields to build the lookup table

</decisions>

<specifics>
## Specific Ideas

- The GlobalExclusionsTab simplification is a "clean up in Phase 9" decision — do not defer to Phase 10
- The subtitle + link to Command Runner doubles as a discoverability hint for the classification workflow; it is not an action button, just a contextual navigation aid
- The info banner triggers **only after at least one remove action in the current page session** — it should not appear on initial load
- The unresolved count badge in the header is separate from the info banner; it is always visible when there are unresolvable entries

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
- `atomicWrite` utility: already used in `overrides.ts` and `templates.ts` — Phase 9 DELETE handler must use this same utility for `Global.json` writes
- `parseBomJson` helper in `templates.ts`: handles BOM-prefixed JSON — reuse in the new exclusions route when reading `Global.json`
- `ReclassifyPage.tsx` layout pattern: `flex flex-col h-full` + shadow-less table — copy this structure for `ExclusionsPage.tsx`
- All required shadcn components already installed: `Table`, `Button`, `Dialog`, `Badge`, `Skeleton` — no new installs needed
- `sonner` toast pattern already established in Phase 8 — reuse for remove success/error toasts

### Name Resolution Strategy
- Scan `PrivilegedEAM/**/*.json` files at request time for `GET /api/exclusions`
- Each PrivilegedEAM JSON object has an `Id` (or `ObjectId`) field — build a `Map<guid, { displayName, tier }>` lookup
- If a GUID from `ExcludedPrincipalId` is not found in the scan, return `displayName: null` and `tier: null` — client renders `Unknown (GUID)` per UI-SPEC

### GlobalExclusionsTab Simplification Scope
- Remove the `<Textarea>` / UUID editing controls from `GlobalExclusionsTab.tsx`
- Display the existing exclusions list as read-only (flat list of GUIDs or basic text)
- Add a `<Link to="/exclusions">` or navigation call
- The tab's API call (`GET /api/templates/global`) can remain as-is — it still reads the raw data for display

</code_context>
