---
phase: 08-object-reclassification-screen
plan: "02"
subsystem: server-routes
tags: [express, overrides, tdd-green, zod-v4, atomic-write, path-traversal]
dependency_graph:
  requires:
    - "Override and OverridesResponse types in gui/shared/types/api.ts (Plan 01)"
    - "Failing overrides.test.ts (RED state, Plan 01)"
    - "atomicWrite utility at gui/server/utils/atomicWrite.ts"
    - "assertSafePath middleware at gui/server/middleware/security.ts"
  provides:
    - "GET /api/overrides — returns { overrides: [] } on missing/invalid file, parsed array when valid"
    - "POST /api/overrides — Zod v4 validated, atomicWrite to Classification/Overrides.json"
    - "overridesRouter registered at /api/overrides in server/index.ts"
  affects:
    - "gui/client/src/hooks/useOverrides.ts (Plan 03 — client hook consumes this endpoint)"
    - "gui/client/src/pages/ReclassifyPage.tsx (Plan 04 — UI wired to this endpoint)"
tech_stack:
  added: []
  patterns:
    - "Zod v4 safeParse for request body validation (error: not message: for custom errors)"
    - "assertSafePath curried path guard prevents directory traversal"
    - "atomicWrite (writeFile tmp + rename) for crash-safe Overrides.json persistence"
    - "fs.mkdir recursive before write — guards against missing Classification/ directory"
    - "Inner try/catch on GET swallows both ENOENT and JSON.parse errors silently"
key_files:
  created:
    - gui/server/routes/overrides.ts
  modified:
    - gui/server/index.ts
decisions:
  - "fs.mkdir(CLASSIFICATION_BASE, { recursive: true }) in POST guards against missing Classification/ dir — matches templates.ts pattern"
  - "Inner try/catch in GET swallows both ENOENT and JSON.parse silently — consistent with dashboard/objects routes returning empty on missing files"
metrics:
  duration: "~8 min"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_changed: 2
---

# Phase 8 Plan 02: Overrides API Endpoint Summary

**One-liner:** GET + POST /api/overrides Express handlers with Zod v4 validation, atomicWrite persistence, and assertSafePath path-traversal guard — all 9 TDD tests GREEN.

## What Was Built

**`gui/server/routes/overrides.ts`** — Full GET and POST route implementation:

- **GET /api/overrides:** Reads `Classification/Overrides.json` via `assertSafePath`. Returns `{ overrides: [] }` on ENOENT or invalid JSON (inner try/catch swallows both). Returns `{ overrides: [...] }` when file exists and passes Zod schema validation.

- **POST /api/overrides:** Validates request body with `OverridesBodySchema` (Zod v4). Returns 400 + flattened error on failure. On success: `fs.mkdir(CLASSIFICATION_BASE, { recursive: true })` to guard against missing directory, then `atomicWrite` (writeFile tmp → rename) to `Classification/Overrides.json`. Returns `{ ok: true }`.

**`gui/server/index.ts`** — `overridesRouter` imported and mounted at `/api/overrides` following the established registration pattern.

## Test Results

All 9 overrides.test.ts cases pass (plan referenced 7; test file has 9 — 3 GET + 6 POST):

| # | Test | Result |
|---|------|--------|
| 1 | GET returns `{ overrides: [] }` when file missing (ENOENT) | ✅ PASS |
| 2 | GET returns parsed overrides when file valid | ✅ PASS |
| 3 | GET returns `{ overrides: [] }` when file has invalid JSON | ✅ PASS |
| 4 | POST returns `{ ok: true }` + atomicWrite on valid payload | ✅ PASS |
| 5 | POST accepts empty overrides array | ✅ PASS |
| 6 | POST returns 400 on invalid OverrideTierLevelName | ✅ PASS |
| 7 | POST returns 400 when overrides field missing | ✅ PASS |
| 8 | POST returns 400 when overrides is not an array | ✅ PASS |
| 9 | POST returns 400 when ObjectId is empty string | ✅ PASS |

Full server suite: **60/60 tests pass**. TypeScript: **zero errors**.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 — overrides.ts (GET + POST) | `40d3342` | feat(08-02): implement GET + POST /api/overrides endpoint |
| 2 — Register in index.ts | `0d76728` | feat(08-02): register overridesRouter at /api/overrides in server/index.ts |

## Verification

- `grep "export { router as overridesRouter }" gui/server/routes/overrides.ts` → ✅
- `grep "atomicWrite" gui/server/routes/overrides.ts` → ✅
- `grep "assertSafePath" gui/server/routes/overrides.ts` → ✅
- `grep "fs.mkdir" gui/server/routes/overrides.ts` → ✅
- `grep "app.use('/api/overrides'" gui/server/index.ts` → ✅
- `cd gui/server && npx vitest run` → 60/60 PASS ✅
- `cd gui && npx tsc --noEmit` → zero errors ✅

## Deviations from Plan

None — plan executed exactly as written. Implementation matches the provided code template precisely.

## Known Stubs

None — endpoint fully functional with real file system reads/writes.

## Self-Check: PASSED

- `gui/server/routes/overrides.ts` — EXISTS ✅
- `gui/server/index.ts` — modified with import + registration ✅
- Commit `40d3342` — EXISTS ✅
- Commit `0d76728` — EXISTS ✅
