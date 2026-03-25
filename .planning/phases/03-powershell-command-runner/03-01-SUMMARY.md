---
phase: 03-powershell-command-runner
plan: "03-01"
status: complete
started: "2026-03-25T18:33:51Z"
completed: "2026-03-25T18:35:32Z"
duration_minutes: 2
commit: 1e3854c
---

# Plan 03-01 Summary: Types, Test Scaffold & Config Router

## What Was Built

Laid the shared contract layer that all downstream plans (02, 03) build against:

1. **`gui/shared/types/commands.ts`** — Single source of truth for all command-runner types:
   - `ALLOWLISTED_CMDLETS` constant (13 cmdlets, `as const`)
   - `AllowlistedCmdlet` type derived from the array
   - `RbacSystemValue`, `CommandStatus`, `CommandOutcome` types
   - `CmdletParameters`, `RunCommandRequest`, `CommandRunEvent` interfaces
   - `RunHistoryRecord`, `CommandHistoryResponse`, `CommandHealthResponse` interfaces

2. **`gui/shared/types/index.ts`** — Added `export * from './commands.js'`

3. **`gui/server/routes/commands.test.ts`** — Wave 0 test scaffold with 17 todo stubs documenting the exact test surface for Plan 02, plus 3 immediately-passing sanity checks on `ALLOWLISTED_CMDLETS`

4. **`gui/server/routes/config.ts`** — `GET /api/config` router returning `EntraOpsConfig.json` (BOM-stripped) or `{}` if file is missing; exports `configRouter`

## Verification

- TypeScript typecheck: ✅ zero errors
- Test suite: ✅ 26 passed | 17 todo (43 total) — 4/4 files pass
- All 3 ALLOWLISTED_CMDLETS sanity tests pass
- All 17 todo stubs correctly show as pending (not failed)

## Deviations

None — implemented exactly as specified in PLAN.md.

## Key Files Created

| File | Purpose |
|------|---------|
| `gui/shared/types/commands.ts` | Shared command types — imported by client, server, and tests |
| `gui/shared/types/index.ts` | Updated re-exports (added commands.js) |
| `gui/server/routes/commands.test.ts` | Wave 0 test scaffold for Plan 02 implementation |
| `gui/server/routes/config.ts` | GET /api/config endpoint (ready to mount in Plan 03) |

## Requirements Addressed

- **RUN-04** — ALLOWLISTED_CMDLETS constant and AllowlistedCmdlet type defined; allowlist integration test stubs created
