# Phase 12: Dry-run / Preview Mode - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 delivers: a dry-run toggle on `ApplyPage.tsx` that lets admins simulate an implementation run — cmdlets execute with `-SampleMode`, nothing is written to Entra, and every screen (confirmation, live log, outcome) is relabeled in sky-blue "simulation" language so the admin cannot mistake a dry-run for a real run.

**Requirements in scope:** IMPL-05
**Depends on:** Phase 11 (ApplyPage.tsx must exist before this phase extends it)
**This phase does NOT:** add new routes, new pages, or new backend routes.

</domain>

<decisions>
## Implementation Decisions

### The isDryRun State

- **D-01:** Add `const [isDryRun, setIsDryRun] = useState(false)` to `ApplyPage.tsx`. This single boolean threads through all four screen renders. No prop drilling needed — all four screen returns are inside the same component function.
- **D-02:** **No URL param support.** `isDryRun` defaults to `false` on every fresh page load — no `?dryrun=1` parsing. The admin enables the toggle manually. This matches the `useState(false)` spec in `12-UI-SPEC.md` exactly and avoids any risk of accidentally inheriting dry-run state from a bookmark or CTA navigation.
- **D-03:** `isDryRun` is **preserved on "Apply Again"** — the reset handler (`handleApplyAgain`) should NOT reset `isDryRun` to `false`. Admin can immediately simulate again without re-enabling the toggle. They must explicitly turn it off to switch to a live run. This is a safety design decision from `12-UI-SPEC.md`.

### SampleMode Parameter Passthrough

- **D-04:** When `isDryRun` is true, add `parameters.SampleMode = true` to the parameters object built before calling `runSingleCmdlet`. **No server changes needed** — `buildPwshArgs()` in `gui/server/services/commands.ts` already handles `value === true` → `-SampleMode` switch flag. The `CmdletParameters` type already has `SampleMode?: boolean`.

### Run History for Dry-run Runs

- **D-05:** **Exclude dry-run runs from run history.** The rationale: history exists to audit real changes applied to Entra. A dry-run writes nothing — there is nothing to audit. Dry-run records appearing in RunCommandsPage's history panel would show green/red outcome icons with no sky color, potentially misleading admins.
- **D-06:** Implementation: add one guard in `gui/server/services/commands.ts` inside the `runCommand()` function: `if (parameters.SampleMode) { /* skip appendHistory */ }` or equivalently check before calling `appendHistory(record)`. No type changes, no UI changes.

### Stop Button (Screen 3)

- **D-07:** The **Stop button label inherits unchanged from Phase 11** — it stays "Stop". The `TerminalOutput` component does not need to know about `isDryRun`. The outcome heading in the `done` state handles the stopped state correctly: "Dry-run Stopped" (per `12-UI-SPEC.md` Screen 4 table). No changes to `TerminalOutput.tsx`.

### Switch Component Installation

- **D-08:** `Switch` (shadcn) is **not yet installed**. The first plan task must run `npx shadcn@latest add switch` in `gui/client/` before any implementation begins. All other required components (`Alert`, `Badge`, `Separator`) are already installed.

### Screen Contract Reference

- **D-09:** All four screen visual/copy/color changes are **fully specified in `12-UI-SPEC.md`**. The planner MUST read this file — it contains exact class names, copy strings, component variants, and the three-layer safety design. Do not improvise UI details not in that spec.

### Claude's Discretion

- Exact mechanism to exclude dry-run runs from history (guard condition placement within `appendHistory` call site)
- Whether to log a debug message when history is skipped for a dry-run run

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Design Contract (primary spec for this phase)
- `.planning/phases/12-dry-run-preview-mode/12-UI-SPEC.md` — Complete screen-by-screen delta spec for all four ApplyPage states. Contains exact Tailwind classes, copy strings, component variants, color tokens, and three-layer safety design. **Read this before writing any JSX.**

### File to Modify (primary implementation target)
- `gui/client/src/pages/ApplyPage.tsx` — The only client file that changes. 515 lines. All four screen returns live in one component function — `isDryRun` state is accessible to all.

### Server File to Modify (run history exclusion)
- `gui/server/services/commands.ts` — `runCommand()` function contains the `appendHistory(record)` call. Add a `parameters.SampleMode` guard here to skip history for dry-run runs.

### SampleMode Already Wired (no changes needed)
- `gui/server/services/commands.ts` `buildPwshArgs()` (line ~47) — `value === true` → `-${key}` switch flag. `SampleMode: true` already becomes `-SampleMode`. Verified — no server changes needed for parameter passthrough.
- `gui/shared/types/commands.ts` — `CmdletParameters.SampleMode?: boolean` already present. No type changes needed.

### Component to Install Before Implementation
- `Switch` (shadcn) — **NOT installed**. Run `npx shadcn@latest add switch` in `gui/client/` as first task.

### Components Already Installed (no install needed)
- `Alert`, `Badge`, `Separator` — installed from Phase 11. Use directly.
- `TerminalOutput` — `gui/client/src/components/commands/TerminalOutput.tsx` — Reuse unchanged. `onStop` callback stays the same.

### Phase 11 Context (prior decisions to carry forward)
- `.planning/phases/11-implementation-workflow/11-CONTEXT.md` — Decisions D-09 through D-13 cover SSE pattern, TerminalOutput reuse, sequential execution, and outcome detection. All inherited unchanged by Phase 12.

### Requirements
- `.planning/REQUIREMENTS.md` — IMPL-05 is the sole requirement for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Current ApplyPage.tsx Structure
- 515 lines, four `if (pageState === ...)` screen returns inside one component function
- `isDryRun` can be added alongside existing state; all 4 screens have direct scope access
- Terminal separator injection at line ~234: `\n<span class="text-zinc-500">─── ${action.label} · ${timestamp} ───</span>\n` — Phase 12 prefixes `[DRY RUN]` in `text-sky-500 font-semibold` before the separator text when `isDryRun` is true
- Parameters object built at line ~238: `const parameters: CmdletParameters = {}` — add `if (isDryRun) parameters.SampleMode = true;` here

### Confirmation Table — Parameters Column
- Currently shows: `{tenantName.trim() ? tenantName.trim() : 'environment defaults'}`
- In dry-run: append ` -SampleMode`: `{tenantName.trim() ? tenantName.trim() + ' -SampleMode' : '-SampleMode'}`

### OutcomeHeader Inner Function
- Defined at line ~282, inside the component — has direct access to `isDryRun`
- Needs dry-run variants for all 4 outcome states (all-pass, partial-fail, all-fail, stopped) per `12-UI-SPEC.md`

### Run History Guard Location
- `gui/server/services/commands.ts` line ~181: `appendHistory(record)` — add `if (!parameters.SampleMode)` guard before this call

### FlaskConical Icon
- **Verified available** in lucide-react 1.6.0 (installed at `gui/node_modules/lucide-react`)
- Import alongside existing Lucide icons already in ApplyPage.tsx

</code_context>

<specifics>
## Specific Ideas

- User consistently delegates UI and implementation detail decisions — prioritise simplicity and spec-compliance over innovation
- The UI-SPEC is the authoritative source; do not improvise visual details not present there
- The `isDryRun` reset-preservation on "Apply Again" is intentional safety design — do not change it
- Run history exclusion is the one server-side change; keep it minimal (one guard, no type changes)

</specifics>

<deferred>
## Deferred Ideas

- Terminal line-spacing fix in SSE output — already in PROJECT.md deferred list (post-v1.2)
- Pre-install prerequisite PowerShell modules in UI setup gate — already in PROJECT.md deferred list (post-v1.2)

</deferred>

---

*Phase: 12-dry-run-preview-mode*
*Context gathered: 2026-04-04*
