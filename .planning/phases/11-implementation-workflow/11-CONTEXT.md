# Phase 11: Implementation Workflow - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 delivers: a new "Apply to Entra" screen where admins select which of the 4 implementation cmdlets to run, review a pre-run confirmation of what will execute, watch real-time SSE output as cmdlets run sequentially, and see a pass/fail outcome summary per cmdlet after completion.

**Requirements in scope:** IMPL-01, IMPL-02, IMPL-03, IMPL-04, IMPL-06, IMPL-07
**Out of scope (Phase 12):** IMPL-05 — dry-run / `-SampleMode` toggle
**Depends on:** Phase 10 (Exclusions complete; all pre-apply review done)

</domain>

<decisions>
## Implementation Decisions

### Page Structure

- **D-01:** `Claude's Discretion` — single `/implement` page with a **3-phase state machine**: (1) Setup — action selection; (2) Confirmation — readonly pre-run summary; (3) Running + Outcome — live SSE log transitioning to pass/fail summary. No separate routes for each phase. No stepper/wizard chrome. Prioritise simplicity.
- **D-02:** `Claude's Discretion` — page layout uses the established **H1 page + adapting content area** pattern (same as ReclassifyPage, ExclusionsPage). The main content region changes based on current phase state.

### CTAs on Object Browser & Reclassify (IMPL-02)

- **D-03:** `Claude's Discretion` — add an "Apply to Entra →" call-to-action on both Object Browser and Reclassify screens. Exact placement (header-level button, inline banner, etc.) left to Claude; follow existing layout patterns on those screens. Copy should be concise and action-oriented.

### Action Selection (IMPL-04)

- **D-04:** 4 implementation cmdlets selectable as toggles (checkboxes):
  1. Administrative Units — `Update-EntraOpsPrivilegedAdministrativeUnit`
  2. Conditional Access Groups — `Update-EntraOpsPrivilegedConditionalAccessGroup`
  3. Unprotected AUs — `Update-EntraOpsPrivilegedUnprotectedAdministrativeUnit`
  4. ControlPlane Scope — `Update-EntraOpsClassificationControlPlaneScope`
- **D-05:** All 4 cmdlets are **already on the allowlist** in `shared/types/commands.ts` — no allowlist changes needed for Phase 11.
- **D-06:** `Claude's Discretion` — default selection state (all checked or last-used state). Keep simple.

### Pre-run Confirmation Screen (IMPL-03)

- **D-07:** `Claude's Discretion` — confirmation screen shows the selected cmdlets (human-friendly display names) and any parameters that will be passed before anything runs. Layout and exact info shown left to Claude.
- **D-08:** No `-SampleMode` toggle on confirmation screen — that is **Phase 12 only**. Dry-run is explicitly out of scope for Phase 11.

### SSE Progress Log (IMPL-06)

- **D-09:** `Claude's Discretion` — reuse existing **`TerminalOutput` component** and the `fetch + ReadableStream` SSE pattern from RunCommandsPage. Do not use EventSource (GET-only). Reuse existing `commands.ts` POST `/api/commands/run` endpoint sequentially — one cmdlet at a time.
- **D-10:** `Claude's Discretion` — multi-cmdlet output display approach (combined stream with separators vs per-cmdlet accordion). Prioritise simplicity; one combined stream with visual separators (like RunCommandsPage's `─── cmdlet · timestamp ───` line) is the established pattern.
- **D-11:** 4 cmdlets run **sequentially** (not in parallel) — each must complete before the next starts. PS session state and Entra write ordering require this.

### Outcome Summary (IMPL-07)

- **D-12:** `Claude's Discretion` — pass/fail detection and outcome display approach. A summary card below the terminal output (after all cmdlets complete) showing check/x per cmdlet is the recommended pattern for admin clarity.
- **D-13:** Pass/fail detection: `Claude's Discretion` — use process exit code from the existing `runCommand` service (already tracked in `CommandStatus`). Exit 0 = pass, non-zero = fail.

### Claude's Discretion

- Exact CTA button copy and placement on Object Browser and Reclassify screens
- Default action selection state (all-on vs persisted)
- Confirmation screen information density and exact layout
- Combined stream vs accordion for multi-cmdlet output
- Outcome summary layout (card below log vs inline badges)
- Pass/fail detection mechanism (exit code preferred)
- Sidebar icon choice for the new nav entry (e.g., `PlayCircle`, `Rocket`, `Send`)
- Whether to show a "Run again" button after completion

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SSE Execution Pattern (reuse for implementation runner)
- `gui/server/routes/commands.ts` — POST `/api/commands/run`: SSE headers, `sendEvent()`, `runCommand()` callback pattern. Phase 11 reuses this endpoint directly — no new backend route needed for Phase 11.
- `gui/server/services/commands.ts` — `runCommand()`, `isRunning()`, `stopCommand()` — execution service. Phase 11 runs 4 cmdlets sequentially through this service.
- `gui/shared/types/commands.ts` — `ALLOWLISTED_CMDLETS` (the 4 implementation cmdlets are already allowed), `CommandStatus`, `RunCommandRequest` types.

### Client SSE Streaming Pattern (reuse for ImplementPage)
- `gui/client/src/pages/RunCommandsPage.tsx` — `fetch + ReadableStream` SSE consumption pattern, `TerminalOutput` component usage, `AbortController` for stop/cancel, status state machine (`idle → running → done/error`). **Primary pattern to replicate for Phase 11.**
- `gui/client/src/components/commands/TerminalOutput.tsx` — ANSI-aware terminal output display component. Reuse directly.

### Navigation & Routing Integration Points
- `gui/client/src/components/layout/Sidebar.tsx` — `NAV_ITEMS` const array. Insert a new entry for `/implement` (after Exclusions or Run Commands — position at Claude's discretion).
- `gui/client/src/App.tsx` — Add `<Route path="implement" element={<ImplementPage />} />` inside `<AppShell />`.

### CTA Integration Points (IMPL-02)
- `gui/client/src/pages/ObjectBrowser.tsx` — CTA "Apply to Entra →" navigates to `/implement`. Exact placement at Claude's discretion.
- `gui/client/src/pages/ReclassifyPage.tsx` — Same CTA. Exact placement at Claude's discretion.

### Page Layout Pattern to Follow
- `gui/client/src/pages/ExclusionsPage.tsx` — `flex flex-col h-full` layout with H1 header, subtitle, and main content area. Phase 11's `ImplementPage` should follow this pattern.
- `gui/client/src/pages/ReclassifyPage.tsx` — Same layout pattern for reference.

### Requirements
- `.planning/REQUIREMENTS.md` — IMPL-01, IMPL-02, IMPL-03, IMPL-04, IMPL-06, IMPL-07 are the in-scope requirements for this phase. IMPL-05 is Phase 12.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TerminalOutput` component + `AnsiConvert` class: already used in RunCommandsPage for ANSI-aware SSE rendering — import directly
- `fetch + ReadableStream` SSE pattern: fully established in RunCommandsPage with ReadableStream reader, chunk decoding, `data:` prefix parsing, and `[DONE]` sentinel handling
- `Checkbox` (shadcn): already installed and used in RunCommandsPage for SampleMode toggle — use for action selection
- `CommandStatus` state type: `'idle' | 'running' | 'done' | 'error'` — already covers the state machine needs
- `runCommand` service: already handles exit code tracking and fires an `onDone` callback — exit code available for pass/fail detection
- Sonner `toast.success` / `toast.error`: already mounted in app root — use for quick feedback

### Established Patterns
- SSE execution: POST to `/api/commands/run` with `{ cmdlet, parameters }` body — fires one at a time; service has `isRunning()` guard
- AbortController for stop: pattern exists in RunCommandsPage; Phase 11 inherits stop behaviour
- Sequential multi-cmdlet: RunCommandsPage already handles one-at-a-time via `isRunning()` guard — Phase 11 client chains them in sequence using `async/await` loop

### Integration Points
- Sidebar `NAV_ITEMS`: add one entry for `/implement`
- App.tsx: add one `<Route>` 
- ObjectBrowser.tsx and ReclassifyPage.tsx: add one CTA button each, navigating to `/implement`

</code_context>

<specifics>
## Specific Ideas

- User consistently delegates UI layout decisions — prioritise simplicity and reuse over novelty
- All decisions are Claude's discretion except: (1) IMPL-05 / `-SampleMode` stays out of Phase 11 entirely; (2) the 4 cmdlets run sequentially, not in parallel; (3) no new backends needed — reuse existing `commands.ts` POST endpoint
- Phase 12 will extend Phase 11 with the dry-run toggle — plan Phase 11 code to be extensible for a `-SampleMode` parameter without needing structural changes

</specifics>

<deferred>
## Deferred Ideas

- Dry-run / `-SampleMode` toggle — **Phase 12** (IMPL-05)
- Pre-install prerequisite PS modules check in UI setup gate — deferred to post-v1.2 (already in PROJECT.md deferred list)
- Terminal line-spacing fix in SSE output — deferred to post-v1.2 (already in PROJECT.md deferred list)
- "Run again" after completion — Claude's discretion whether to include; not a named requirement

</deferred>

---

*Phase: 11-implementation-workflow*
*Context gathered: 2026-04-04*
