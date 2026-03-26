# Phase 6: Settings & Polish — Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view and edit `EntraOpsConfig.json` from the browser in a structured form with diff preview and Zod validation, with a safe view-only default and a git-commit reminder after saves. When no config exists, a guided empty state generates the correct PowerShell command to copy. Separately, accumulated cross-cutting UX rough edges from Phases 1–5 are resolved — including three known deferred issues, the terminal line-spacing bug, and a final sidebar nav audit. This is the final phase of the v1.0 milestone.

</domain>

<decisions>
## Implementation Decisions

### A. Config Form Organization

**Single scrollable page** — not tabs. One `SettingsPage` with visually distinct section headers grouping the 13 top-level keys into four sections:
1. **Identity & Auth** — `TenantId`, `TenantName`, `AuthenticationType`, `ClientId`, `DevOpsPlatform`, `RbacSystems`
2. **Automation** — `AutomatedClassificationUpdate`, `AutomatedControlPlaneScopeUpdate`, `AutomatedEntraOpsUpdate`, `WorkflowTrigger`
3. **Integrations** — `LogAnalytics`, `SentinelWatchLists`
4. **AD Management** — `AutomatedAdministrativeUnitManagement`, `AutomatedConditionalAccessTargetGroups`, `AutomatedRmauAssignmentsForUnprotectedObjects`

**Read-only fields:** `TenantId` and `TenantName` are displayed as read-only text (not inputs). They are set by `New-EntraOpsConfigFile` via live tenant lookup and must not be hand-edited. Render as greyed-out text with a small lock/info icon and tooltip: "Set by New-EntraOpsConfigFile — edit in PowerShell."

**Toggle-controlled sub-fields:** Nested sections that have a boolean enable toggle at their root (e.g. `IngestToLogAnalytics`, `ApplyAutomatedClassificationUpdate`, `ApplyAutomatedControlPlaneScopeUpdate`) disable and visually grey out all sub-fields when the toggle is `false`. Sub-fields remain visible — not collapsed — so users understand what they're configuring before enabling.

**Cron picker:** `WorkflowTrigger.PullScheduledCron` and `WorkflowTrigger.UpdateScheduledCron` use a simple 5-field inline picker — five `<select>` dropdowns for minute / hour / day-of-month / month / day-of-week — with a read-only preview of the resulting cron string below. **No new npm dependency.** Common values per field (e.g. `*`, `0`, `30`, every-hour options) pre-populated in each dropdown. The raw cron string itself is what gets written to the file.

### B. Save Pattern

**View-only by default** — the form loads in read-only display mode. An **"Edit Settings"** button in the page header unlocks all editable fields. This prevents accidental changes.

**Whole-file save with DiffDialog** — one "Preview Changes" button for the entire settings page. Opens the same `DiffDialog` component (reuse from Phase 2) showing before/after of the full `EntraOpsConfig.json`. Confirm writes the file; Cancel returns to edit mode with state preserved.

**Zod validation gates the diff** — the full config object is validated against a Zod schema before DiffDialog opens. Inline field-level errors shown on any failing field; DiffDialog blocked until all pass.

**Dirty state with indicator** — while in edit mode, if the user scrolls away or changes sections within the page without saving, dirty state is preserved. A persistent "Unsaved changes" amber badge in the page header makes this visible at all times during edit mode.

**SaveBanner after save** — same `SaveBanner` component as Phase 2 (amber alert: "Changes saved — remember to commit EntraOpsConfig.json to git") appears after a successful write. Dismissible. Reappears on next save.

**Atomic write** — same temp-file → rename pattern as Phase 2 `atomicWrite()`. No partial writes on crash.

### C. Polish Scope

**Three deferred known issues — all in scope:**
1. **DiffDialog viewport overflow** — `DiffDialog.tsx` `<pre>` content area needs `max-h-[60vh] overflow-y-auto` so large diffs scroll inside the dialog rather than overflowing the viewport.
2. **Preview Changes silent no-op** — `TierAccordion.tsx` `Preview Changes` button should be `disabled` when `dirtyActions[key]` is undefined. Add `disabled` prop + `cursor-not-allowed opacity-50` styling. No toast needed — disabled state is self-explanatory.
3. **TierAccordion no visual feedback before first edit** — same fix as #2; the disabled button state communicates that an edit must be made first.

**Terminal line spacing bug (UI fix, in scope):**
- Root cause: `TerminalOutput.tsx` `<pre>` uses `leading-relaxed` (line-height 1.625) — too loose for dense terminal output.
- Additionally, PowerShell `\r\n` line endings pass through `ansi-to-html` and `whitespace-pre-wrap` renders the `\r` as a visible gap.
- Fix: Change `leading-relaxed` → `leading-normal` (line-height 1.5) on the `<pre>`. Strip `\r` from raw output before passing to `AnsiConvert` in the server-side SSE stream or client-side conversion. Apply to both `ConnectPage.tsx` and `RunCommandsPage.tsx` (both use `TerminalOutput`).

**Final sidebar nav audit (in scope):**
- Verify all 6 pages have correct: label, icon, `NavLink` active state, route path, and consistent ordering.
- Expected order: Dashboard | Objects | Templates | Commands | Connect | History | Settings
- Settings nav entry must be added as part of this phase.

### D. Empty State (No Config File)

**Mini-form generator** — when `GET /api/config` returns `{}` and no config exists on disk, `SettingsPage` renders an empty state with:
1. A brief explanation of what `EntraOpsConfig.json` is and that it needs to be created.
2. A `TenantName` text input (the only required param).
3. A copyable code block that updates live as the user types, e.g.:
   ```
   New-EntraOpsConfigFile -TenantName "contoso.onmicrosoft.com"
   ```
4. An **"Show advanced options"** disclosure toggle that reveals all optional parameters as additional inputs (`-AuthenticationType`, `-RbacSystems`, `-IngestToLogAnalytics`, etc.) — collapsed by default for simplicity, discoverable when needed. When expanded, the generated command updates to include those flags.
5. A **"Check again"** button that re-fetches `GET /api/config` without a full page refresh — so the user can run the cmdlet in their terminal and return to the page to see it load.

**No routing change** — the Settings page renders either the form or the empty state based on the API response. No separate route.

**View-only on first load after creation** — once the config exists and loads, the same view-only + "Edit Settings" default applies. No special onboarding mode.

### Claude's Discretion
- Exact section card styling (border/background/padding) within the scrollable form
- Icon choices for each sidebar nav entry
- Exact Zod schema shape for `EntraOpsConfig.json` (derive from `New-EntraOpsConfigFile` parameter set)
- Cron field dropdown option lists
- Loading skeleton for Settings page while `GET /api/config` is in flight
- Copy-to-clipboard button styling on the empty state code block

</decisions>

<specifics>
## Specific Notes

- The cron picker must NOT introduce a new npm package. Five `<select>` dropdowns with common values inline is the approach. The generated cron string preview beneath them is the source of truth written to the file.
- `DiffDialog` is already installed and working. The settings save flow reuses it exactly — `before` = `JSON.stringify(currentDiskConfig, null, 2)`, `after` = `JSON.stringify(editedConfig, null, 2)`.
- The `GET /api/config` route already exists at `gui/server/routes/config.ts` and returns `{}` when the file is missing. The Phase 6 settings router will extend this file with a `PUT /api/config` route using the same `atomicWrite` pattern.
- The terminal spacing bug affects both `ConnectPage` and `RunCommandsPage` — both must be fixed in the same plan. The fix is two-part: CSS (`leading-relaxed` → `leading-normal`) and `\r` stripping.
- `TenantId` and `TenantName` read-only: render as `<p>` or `<input disabled>` with a `Lock` icon from lucide-react and a shadcn `Tooltip` explaining why.
- The "Unsaved changes" indicator must be visible while scrolling — it should live in the sticky page header, not inline in a section.
- Polish plan should include a TypeScript build check and a full `npm test` run across client and server to confirm no regressions from the `TerminalOutput` and `DiffDialog` changes.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` §Settings — SETT-01, SETT-02, SETT-03
- `.planning/ROADMAP.md` §Phase 6 — success criteria (2 conditions that must be TRUE)

### Architecture & Stack Decisions
- `.planning/STATE.md` §Decisions — locked technology choices (Tailwind v4, Express v5, Zod v4, atomic writes)
- `.planning/phases/02-classification-template-editor/02-CONTEXT.md` — DiffDialog + SaveBanner pattern; atomic write pattern; Zod validation gate before save

### Existing Code to Reuse / Extend
- `gui/server/routes/config.ts` — existing `GET /api/config`; add `PUT /api/config` here with `atomicWrite` and Zod validation
- `gui/client/src/components/templates/DiffDialog.tsx` — reuse as-is for settings diff preview
- `gui/client/src/components/templates/SaveBanner.tsx` — reuse as-is for post-save git reminder
- `gui/client/src/components/commands/TerminalOutput.tsx` — fix `leading-relaxed` → `leading-normal` and `\r` stripping (affects ConnectPage + RunCommandsPage)
- `gui/client/src/components/templates/TierAccordion.tsx` — fix `Preview Changes` disabled state
- `gui/client/src/components/layout/Sidebar.tsx` — add Settings nav entry; audit all 6 entries
- `gui/shared/types/api.ts` — add `EntraOpsConfig` type; derive shape from `New-EntraOpsConfigFile` parameter set

### Source of Truth for Config Schema
- `EntraOps/Public/Configuration/New-EntraOpsConfigFile.ps1` — parameter definitions and `$EnvConfigSchema` ordered hashtable (lines ~120–190) define every key, type, and default value in `EntraOpsConfig.json`

### Known Deferred Issues Being Resolved
- `.planning/todos/done/2026-03-25-fix-diffdialog-overflow-in-large-template-previews.md` — previously done but recheck still needed
- `.planning/STATE.md` §Decisions — "DiffDialog cosmetic overflow is non-blocking: affects large templates in small windows, captured as polish todo"
- `.planning/phases/02-classification-template-editor/02-VERIFICATION.md` lines 169–201 — Preview Changes silent no-op and DiffDialog overflow warning details

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DiffDialog.tsx` — drop-in reuse; accepts `before: string`, `after: string`, `open: boolean`, `onConfirm`, `onCancel`
- `SaveBanner.tsx` — drop-in reuse; accepts `savedAt: number`
- `atomicWrite()` in `gui/server/routes/templates.ts` — copy or extract to shared server util for reuse in config route
- `assertSafePath()` in `gui/server/middleware/security.ts` — must be used on `CONFIG_PATH` in the PUT route (already used in GET, needs to be applied to PUT)
- `parseBomJson()` in `gui/server/routes/config.ts` — already strips BOM; reuse for round-trip reads

### Patterns to Follow
- Section cards: follow the same Card + CardHeader + CardContent pattern used in Dashboard KPI cards
- Toggle + disabled sub-fields: follow `GlobalExclusionsTab.tsx` pattern of `disabled` prop on inputs when a condition is false
- Read-only display: follow `ConnectPage.tsx` step-complete display (grey text, lock icon, non-interactive)
- Empty state: follow `Dashboard.tsx` `EmptyState` component structure (icon + heading + description + action button)
- "Check again" re-fetch: follow `Dashboard.tsx` `onRefresh` pattern (calls `refetch()` from React Query or re-triggers `useEffect` fetch)

### New Files Expected
- `gui/client/src/pages/SettingsPage.tsx` — main settings page (form + empty state)
- `gui/client/src/components/settings/ConfigForm.tsx` — editable form sections
- `gui/client/src/components/settings/ConfigEmptyState.tsx` — mini-form generator empty state
- `gui/shared/types/config.ts` — `EntraOpsConfig` TypeScript type

</code_context>
