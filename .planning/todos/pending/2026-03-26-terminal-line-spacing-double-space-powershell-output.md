# Todo: Fix terminal line spacing — double-spaced PowerShell output

**Captured:** 2026-03-26
**Phase:** 6 (Settings & Polish) — in scope

## Problem

The `TerminalOutput` component shows large gaps between each line of PowerShell output (reported on ConnectPage classification step). Two root causes:

1. `<pre>` uses `leading-relaxed` (line-height 1.625) — too generous for dense terminal output
2. PowerShell emits `\r\n` line endings; `whitespace-pre-wrap` renders the `\r` as an extra blank line

## Fix

- `gui/client/src/components/commands/TerminalOutput.tsx`: change `leading-relaxed` → `leading-normal` on the `<pre>` element
- Strip `\r` from raw output before passing to `AnsiConvert` — either in the server SSE stream or client-side in the conversion step
- Affects: `ConnectPage.tsx` and `RunCommandsPage.tsx` (both use `TerminalOutput`)

## Status
Tracked in Phase 6 Polish plan.
