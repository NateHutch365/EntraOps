---
phase: 03-powershell-command-runner
plan: "03"
subsystem: client-ui
tags: [react, command-runner, sse, terminal, ansi, history, shadcn]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [run-commands-page, terminal-output, command-history, sidebar-nav, run-route]
  affects: [gui/client/src/App.tsx, gui/client/src/components/layout/Sidebar.tsx]
tech_stack:
  added: [ansi-to-html, shadcn/checkbox]
  patterns: [sse-fetch-reader, ansi-html-rendering, popover-command-palette, confirmation-dialog]
key_files:
  created:
    - gui/client/src/pages/RunCommandsPage.tsx
    - gui/client/src/components/commands/TerminalOutput.tsx
    - gui/client/src/components/commands/CommandHistory.tsx
    - gui/client/src/components/ui/checkbox.tsx
  modified:
    - gui/server/index.ts
    - gui/client/src/App.tsx
    - gui/client/src/components/layout/Sidebar.tsx
    - .gitignore
decisions:
  - "ansi-to-html Convert instance held in useRef to preserve stream state across re-renders"
  - "All CmdletParameters fields treated as optional (no Required-block on Run button) — matches interface definition"
  - "Update-EntraOps confirmation Dialog added as special-case for no-param cmdlet"
  - "Run separator injected as HTML string directly into htmlContent state (not a true DOM element)"
  - "shadcn Popover + Command component used for command palette (cmdk already in client deps)"
  - "dangerouslySetInnerHTML with security comment: content comes exclusively from pwsh child_process output, app is 127.0.0.1-bound"
metrics:
  duration_minutes: 22
  completed_date: "2026-03-25"
  tasks_completed: 3
  files_created: 4
  files_modified: 4
---

# Phase 03 Plan 03: Wire Server Routes + Command Runner UI Summary

**One-liner:** Full command runner UI with SSE fetch-stream, ANSI terminal, run history and popover command palette wired to `/api/commands` and `/api/config`.

## What Was Built

- **Server route mounts** — `commandsRouter` and `configRouter` imported and mounted in `gui/server/index.ts` at `/api/commands` and `/api/config` respectively
- **`.gitignore`** — `gui/.entraops-run-history.json` added (tenant-specific operational data)
- **`TerminalOutput`** — ANSI-to-HTML rendering via `ansi-to-html`; auto-scroll (pause when user scrolls up, resume at bottom); status badge (Running/Complete/Failed/Stopped); Stop button visible only during `running` state; `AnsiConvert` re-exported for stateful stream converter in parent
- **`CommandHistory`** — Scrollable list with `ScrollArea` (h-48); outcome icons (✓/✕/◼); hover Re-run cue; click fires `onSelect` callback to repopulate form
- **`RunCommandsPage`** — Full page:
  - Popover + shadcn `Command`/`CommandInput`/`CommandList` palette for all 13 allowlisted cmdlets with live filter
  - Parameter form with RbacSystems checkboxes (5), SampleMode toggle, TenantName + SubscriptionId inputs pre-populated from `GET /api/config`
  - `handleRun()` — fetch POST with `ReadableStream` reader, SSE frame parsing (`data: …\n\n`), run separator injection, exit-code-driven status update, history refresh
  - `handleStop()` — POST `/api/commands/stop`, injects stopped message, sets status to `stopped`
  - `Update-EntraOps` confirmation Dialog (shadcn) before execution
  - `handleHistorySelect()` re-populates all form fields from history record
  - Two-column layout (320px params / 1fr terminal) on lg breakpoint, stacked on mobile
- **Sidebar** — `Terminal` icon added to lucide-react import; `{ to: '/run', icon: Terminal, label: 'Run Commands' }` added to `NAV_ITEMS`
- **App.tsx** — `<Route path="run" element={<RunCommandsPage />} />` added inside `<AppShell>` block

## Verification

- `commandsRouter` and `configRouter` mounted in `server/index.ts` ✓
- `gui/.entraops-run-history.json` in `.gitignore` ✓
- TypeScript: zero errors across workspace (`npm run typecheck` → EXIT 0) ✓
- Server tests: 43/43 passed (all commands + templates tests green) ✓
- `fetch('/api/commands/run')` in RunCommandsPage ✓
- `fetch('/api/config')` in RunCommandsPage ✓
- `fetch('/api/commands/stop')` in RunCommandsPage ✓
- `Terminal` import + `{ to: '/run'` in Sidebar ✓
- `<Route path="run"` in App.tsx ✓

## Deviations from Plan

**1. [Rule 2 - Missing validation] Import path extension removed**
- **Found during:** Task 2
- **Issue:** Plan template used `from '…/commands.js'` extension, but existing client code uses no extension (`from '…/commands'`) per `moduleResolution: "bundler"` convention
- **Fix:** Removed `.js` from all relative shared-type imports in components
- **Files modified:** `TerminalOutput.tsx`, `CommandHistory.tsx`

**2. [Rule 2 - Decision] All CmdletParameters fields shown as optional**
- **Found during:** Task 3 design
- **Issue:** Plan mentioned "Required params block the Run button" but `CmdletParameters` interface has all fields as optional with no per-cmdlet required-field schema
- **Fix:** Showed all params as optional with "(optional)" labels — consistent with type definitions; blocked Run only when no cmdlet is selected or already running

## Known Stubs

None — all data is wired to live API endpoints. Config fields pre-populate from `GET /api/config`. History loads from `GET /api/commands/history`. Stream reads from `POST /api/commands/run`.

## Self-Check
