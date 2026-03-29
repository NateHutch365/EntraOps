---
phase: 02-classification-template-editor
plan: 01
subsystem: api
tags: [express, zod, typescript, rest-api, security]

requires:
  - phase: 01-foundation-dashboard-object-browser
    provides: Express server, assertSafePath middleware, shared types pattern

provides:
  - Template TypeScript types (TemplateName, TierBlock, TierLevelDefinitionEntry, GlobalExclusion, GetTemplateResponse, GetGlobalResponse)
  - Express router for all /api/templates/* endpoints
  - Atomic file write helper (tmp → rename pattern)
  - BOM-stripping JSON parser
  - Path-traversal guard on template file reads/writes

affects: [02-classification-template-editor, client-template-editor-ui]

tech-stack:
  added: [supertest (dev, for route integration tests)]
  patterns:
    - assertSafePath wrapping TEMPLATES_BASE for all :name route file I/O
    - Zod v4 safeParse returning 400 with error.flatten() on failure
    - Atomic write via fs.writeFile to .tmp then fs.rename to final path
    - BOM stripping via raw.replace(/^\uFEFF/, '') before JSON.parse
    - /global route registered BEFORE /:name to prevent param capture

key-files:
  created:
    - gui/shared/types/templates.ts
    - gui/server/routes/templates.ts
    - gui/server/src/__tests__/templates.test.ts
  modified:
    - gui/shared/types/index.ts
    - gui/server/index.ts
    - gui/server/package.json

key-decisions:
  - "TEMPLATE_NAMES constant inlined in routes file (not imported from shared types) to avoid cross-workspace ESM module resolution issues"
  - "Zod v4 z.string().uuid() requires valid UUID version digits [1-8] — test GUIDs must use version 4 format (e.g. 550e8400-e29b-41d4-a716-446655440000)"
  - "Global endpoint returns { exclusions: [] } rather than 404 when Global.json is missing, to simplify client handling"

patterns-established:
  - "Atomic write pattern: write to .tmp file then fs.rename to final path — prevents partial writes"
  - "Route ordering: /global before /:name in Express router to avoid param capture"
  - "Zod v4 UUID validation: z.string().uuid() is strictly RFC-compliant, test data must use real version digits"

requirements-completed:
  - TMPL-04
  - TMPL-05

duration: 25min
completed: 2026-03-25
---

# Phase 02-01: Template API Types and Routes

**TypeScript contracts and Express REST API for reading/writing EAM classification template JSON files, with path-traversal guard and schema validation.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-25T08:35:00Z
- **Completed:** 2026-03-25T08:40:00Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- Created all TypeScript types for the template editor (`TemplateName`, `TierBlock`, `TierLevelDefinitionEntry`, `GlobalExclusion`, `GetTemplateResponse`, `GetGlobalResponse`)
- Implemented 5 Express endpoints: `GET /api/templates`, `GET /api/templates/global`, `PUT /api/templates/global`, `GET /api/templates/:name`, `PUT /api/templates/:name`
- All routes validated with Zod v4, atomic writes via tmp→rename pattern, BOM stripping, and path-traversal guard
- 13 integration tests via supertest covering success paths, 400/403 error paths, and BOM handling

## Task Commits

1. **Task 1: Template TypeScript types** - `1430dbb` (feat)
2. **Task 2: Express template routes** - `50588b9` (feat + tests)

## Files Created/Modified

- `gui/shared/types/templates.ts` — All template TypeScript types and the `TEMPLATE_NAMES` constant array
- `gui/shared/types/index.ts` — Added `export * from './templates.js'`
- `gui/server/routes/templates.ts` — Full Express router for `/api/templates/*`
- `gui/server/index.ts` — Registered `templatesRouter` at `/api/templates`
- `gui/server/src/__tests__/templates.test.ts` — 13 supertest integration tests
- `gui/server/package.json` — Added supertest + @types/supertest as devDependencies

## Decisions Made

- **TEMPLATE_NAMES inlined in routes**: Importing from shared types caused cross-workspace ESM resolution issues during test runs; inlining avoids the problem without duplication of logic
- **Zod v4 UUID strictness**: `z.string().uuid()` validates RFC UUID version digits — changed test GUID from `00000000-0000-0000-0000-000000000001` to `550e8400-e29b-41d4-a716-446655440000`
- **`/global` before `/:name`**: Express route ordering — `/global` must be registered first or "global" gets captured as a `:name` param

## Deviations from Plan

**1. Zod v4 UUID test fixture**
- **Found during:** Task 2 (test run)
- **Issue:** Test used `00000000-0000-0000-0000-000000000001` which Zod v4 rejects (version digit `0` is not in `[1-8]`)
- **Fix:** Replaced with `550e8400-e29b-41d4-a716-446655440000` (valid v4 UUID)
- **Files modified:** `gui/server/src/__tests__/templates.test.ts`
- **Verification:** All 23 tests pass
- **Committed in:** `50588b9`

**2. supertest added as devDependency**
- **Found during:** Task 2 planning
- **Issue:** No HTTP testing library available for route integration tests
- **Fix:** Installed `supertest` + `@types/supertest` to server workspace
- **Files modified:** `gui/server/package.json`
- **Impact:** Enables comprehensive HTTP-level testing of all route behaviors

## Issues Encountered

None beyond the Zod UUID fixture issue (documented above).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 02-02 (client Route + store shell) and 02-03 (TemplateEditor page) can now proceed — they depend on these types and API endpoints. The `TemplateName`, `GetTemplateResponse` and `GetGlobalResponse` types are exported from `@entraops/shared/types` and ready for client-side consumption.
