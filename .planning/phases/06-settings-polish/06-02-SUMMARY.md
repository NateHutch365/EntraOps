---
phase: 06-settings-polish
plan: 02
subsystem: ui
tags: [react, tailwind, ansi-to-html, lucide-react, react-router]

requires: []
provides:
  - Terminal output with correct line height (leading-normal, 1.5) in TerminalOutput component
  - PowerShell \r character stripping before ansi-to-html conversion in RunCommandsPage and ConnectPage
  - Settings entry in sidebar NAV_ITEMS (7 entries, correct order: Dashboard, Objects, Templates, Commands, Connect, History, Settings)
  - Stub SettingsPage component at gui/client/src/pages/SettingsPage.tsx
  - /settings route wired in App.tsx
affects: [06-settings-polish]

tech-stack:
  added: []
  patterns:
    - "Strip \\r from SSE event.data before ansi-to-html conversion to prevent PowerShell whitespace artifacts"
    - "Use leading-normal (1.5) not leading-relaxed (1.625) for dense terminal output"

key-files:
  created:
    - gui/client/src/pages/SettingsPage.tsx
  modified:
    - gui/client/src/components/commands/TerminalOutput.tsx
    - gui/client/src/pages/RunCommandsPage.tsx
    - gui/client/src/pages/ConnectPage.tsx
    - gui/client/src/components/layout/Sidebar.tsx
    - gui/client/src/App.tsx

key-decisions:
  - "Nav order per CONTEXT.md §C: Dashboard, Objects, Templates, Run Commands, Connect, History, Settings"
  - "SettingsPage.tsx created as stub (placeholder) — full implementation in Plan 03"
  - "\\r stripped at toHtml() call site rather than in TerminalOutput component to keep stripping co-located with the data source"

patterns-established:
  - "\\r stripping pattern: event.data.replace(/\\r/g, '') before ansi-to-html toHtml() calls"

requirements-completed: [SETT-01]

duration: 2min
completed: 2026-03-26
---

# Phase 06-02: Settings Polish — UX Fixes & Nav Wiring

**Fixed terminal double-line-spacing and PowerShell \\r artifacts, wired Settings into sidebar and router.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T09:15:21Z
- **Completed:** 2026-03-26T09:17:00Z
- **Tasks:** 2 completed
- **Files modified:** 5 (+ 1 created)

## Accomplishments

### Task 1: Fix terminal line spacing and \r stripping

- **TerminalOutput.tsx:** Changed `leading-relaxed` → `leading-normal` on the `<pre>` element. Line height drops from 1.625 to 1.5, appropriate for dense terminal output.
- **RunCommandsPage.tsx (line 151):** Added `.replace(/\r/g, '')` to `converterRef.current.toHtml(event.data)` call.
- **ConnectPage.tsx:** Added `.replace(/\r/g, '')` to both `toHtml()` call sites (auth stream line 216, classify stream line 272).

Root cause: PowerShell emits `\r\n` line endings over SSE. `ansi-to-html` doesn't strip `\r`, and `whitespace-pre-wrap` renders it as a visible gap. Stripping before conversion fixes both pages.

### Task 2: Settings nav entry + route + stub page

- **Sidebar.tsx:** Added `Settings` to lucide-react import; updated `NAV_ITEMS` to 7 entries in correct order (Dashboard → Objects → Templates → Run Commands → Connect → History → Settings). History and Run Commands/Connect were reordered per CONTEXT.md §C.
- **SettingsPage.tsx:** Created stub component with heading and "Loading..." placeholder text.
- **App.tsx:** Added `import { SettingsPage }` and `<Route path="settings" element={<SettingsPage />} />` after the connect route.

## Deviations

None — all changes matched plan spec exactly.

## Issues Encountered

None.

## Commits

- `9445401` — fix(06-02): fix terminal leading-normal and strip \r from toHtml calls
- `60abd2d` — feat(06-02): add Settings to sidebar nav, stub SettingsPage, wire /settings route

## Self-Check: PASSED

- [x] `gui/client/src/components/commands/TerminalOutput.tsx` contains `leading-normal` ✓
- [x] `gui/client/src/pages/SettingsPage.tsx` exists ✓
- [x] `git log --grep=06-02` returns 2 commits ✓
- [x] `npm run build` passes ✓
