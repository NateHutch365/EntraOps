# Todo: Fix terminal line spacing — inconsistent gaps in ConnectPage output

**Captured:** 2026-03-26
**Phase:** post-6 gap

## Problem

The ConnectPage terminal (auth + classify steps) shows inconsistent gaps between output lines — some lines appear with normal spacing, others have a blank line below them. The spacing is not uniform.

Already applied (did not fully fix):
- `leading-normal` on the `<pre>` in `TerminalOutput.tsx`
- `\r` stripping before `ansi-to-html` in `ConnectPage.tsx`
- Skip empty/whitespace-only SSE chunks
- Collapse consecutive `\n` within each chunk (`/\n{2,}/g → '\n'`)

Still reproducing after all of the above. Suspect the issue is in how `ansi-to-html` renders chunks — each chunk is converted independently so the converter may be injecting wrapping `<span>` or `<div>` elements that add block-level spacing between chunks, rather than the newlines themselves being the problem.

## Solution

Investigate `ansi-to-html` output: log the raw HTML being appended per chunk and inspect what tags it produces. Likely need one of:
1. Keep a single `Convert` instance per terminal session and pass all output through it — already doing this (refs). Verify state is not being reset between chunks.
2. Post-process the accumulated HTML to remove any block-level wrapper elements injected by the library.
3. Render output as plain text (strip ANSI codes) if colour is not critical on ConnectPage.

## Files
- `gui/client/src/pages/ConnectPage.tsx` — auth and classify SSE handlers
- `gui/client/src/components/commands/TerminalOutput.tsx` — `<pre>` render
