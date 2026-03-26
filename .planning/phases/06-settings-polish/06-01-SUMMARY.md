---
phase: 06-settings-polish
plan: "01"
status: complete
commit: e970125
duration: ~20 min
tasks_completed: 2
files_created: 3
files_modified: 2
---

# Plan 06-01 Summary: Config Type, atomicWrite Utility, PUT /api/config

## What Was Built

### Task 1: Shared EntraOpsConfig type + atomicWrite extraction
- Created `gui/shared/types/config.ts` — exported `EntraOpsConfig` interface with all 13 top-level keys matching `EntraOpsConfig.json` shape (derived from `New-EntraOpsConfigFile.ps1` `$EnvConfigSchema`). Includes discriminated union types for `AuthenticationType`, `DevOpsPlatform`, and `RbacSystem`.
- Created `gui/server/utils/atomicWrite.ts` — extracted reusable `atomicWrite(filePath, content)` utility that writes to a `.tmp` file then atomically renames to prevent partial writes.
- Updated `gui/server/routes/templates.ts` — removed inline `atomicWrite` function, added `import { atomicWrite } from '../utils/atomicWrite.js'`. All existing template routes continue working unchanged.

### Task 2: PUT /api/config + Zod validation + server tests
- Extended `gui/server/routes/config.ts` with `EntraOpsConfigSchema` (Zod v4) modeling all 13 top-level config sections with correct types and enums.
- Added `PUT /` route: validates body via `safeParse`, returns 422 with `{ error: issues[] }` on failure, writes atomically on success, returns `{ ok: true }`.
- Created `gui/server/src/__tests__/config.test.ts` with 8 tests covering: GET returns `{}` on missing file, GET parses valid JSON, GET strips BOM, PUT happy path (writeFile + rename called), PUT wrong type → 422, PUT missing fields → 422, PUT invalid AuthenticationType enum → 422, PUT invalid RbacSystem enum → 422.

## Key Files

### Created
- `gui/shared/types/config.ts` — `export interface EntraOpsConfig`
- `gui/server/utils/atomicWrite.ts` — `export async function atomicWrite`
- `gui/server/src/__tests__/config.test.ts` — 8 tests, all passing

### Modified
- `gui/server/routes/config.ts` — added Zod schema + PUT route
- `gui/server/routes/templates.ts` — import atomicWrite from shared util

## Test Results

```
Tests  51 passed (51)  (+8 new)
Files  5 passed (5)    (+1 new)
```

## Decisions Made

- **`CustomSecurityAttributes` included in shared type** — 5th section from CONTEXT.md research open question resolved: included per plan spec.
- **No `assertSafePath` on PUT** — `CONFIG_PATH` is hardcoded (not user-supplied), so path traversal protection is not applicable. Zod schema is the security gate.
- **Zod v4 `error:` not `message:`** — followed Zod v4 breaking change from STATE.md decisions.
- **422 (Unprocessable Entity) for schema failures** — semantically correct for validation errors vs 400 (Bad Request).

## Self-Check: PASSED

- [x] `export interface EntraOpsConfig` in `gui/shared/types/config.ts`
- [x] `TenantId: string` and `WorkflowTrigger` with `PullScheduledCron` present
- [x] `CustomSecurityAttributes` section present
- [x] `export async function atomicWrite` in `gui/server/utils/atomicWrite.ts`
- [x] `gui/server/routes/templates.ts` imports from util, no inline function
- [x] `export const EntraOpsConfigSchema` in `gui/server/routes/config.ts`
- [x] `router.put('/'` with `safeParse` and `res.status(422)` present
- [x] `atomicWrite(CONFIG_PATH, content)` called in PUT
- [x] All 51 tests pass
