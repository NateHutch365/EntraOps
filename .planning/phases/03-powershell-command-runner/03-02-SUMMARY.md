---
phase: 03-powershell-command-runner
plan: "02"
status: complete
commit: ed41eec
---

## Summary

Implemented the PowerShell command execution engine — the security-critical heart of Phase 3.

## What Was Built

### Task 1: `gui/server/services/commands.ts`

Process manager service with:
- **`runCommand`** — spawns `pwsh` with `shell: false`, attaches SSE callbacks (stdout/stderr/exit/error), returns `runId`. Module-level `activeProcess` gate enforces single-run concurrency.
- **`stopCommand`** — sets module-level `isStopped = true` before calling `activeProcess.kill()`, ensuring the close handler records `outcome: 'stopped'`.
- **`getHistory`** / **`appendHistory`** — reads/writes `gui/.entraops-run-history.json` atomically (`.tmp` → rename), capped at 500 entries FIFO via `.slice(-500)`.
- **`checkPwshAvailable`** — `spawnSync('pwsh', ['--version'])` health check.
- **`isRunning`** — boolean guard used by the router before spawning.

### Task 2: `gui/server/routes/commands.ts` + `commands.test.ts`

Router (4 endpoints):
- **POST /run** — Zod `z.enum(ALLOWLISTED_CMDLETS)` validation as first gate (before `isRunning()` check), sets `text/event-stream` headers + `flushHeaders()`, delegates to `runCommand`.
- **POST /stop** — delegates to `stopCommand()`, returns `{ stopped: bool, message? }`.
- **GET /history** — returns `{ records: RunHistoryRecord[] }`.
- **GET /health** — returns `checkPwshAvailable()` result.

All Wave 0 `.todo` stubs filled in (43 tests total, including pre-existing 3 sanity checks).

## Key Files Created/Modified

- `gui/server/services/commands.ts` — NEW
- `gui/server/routes/commands.ts` — NEW
- `gui/server/routes/commands.test.ts` — UPDATED (stubs → full implementations)

## Security Notes

- `spawn('pwsh', args, { shell: false })` — prevents shell metacharacter injection
- `z.enum(ALLOWLISTED_CMDLETS)` is the ONLY path to spawn; checked before `isRunning()`
- `buildPwshArgs` uses positional array construction, never string interpolation

## Test Results

- **43/43 tests passing** (all suites: eamReader, security, templates, commands)
- Concurrency gate (409), stop outcome, history cap, atomic write, SSE headers all verified

## Decisions Made

- Chose direct service-level calls for concurrency/stop/stream-event tests (vs. supertest fire-and-forget patterns) — avoids supertest's lazy request startup race condition with SSE streaming
- `activeRunId` removed (set but never read — would fail `noUnusedLocals`)
