---
plan: 01-04
phase: 01-foundation-dashboard-object-browser
status: complete
completed: 2026-03-24
commits:
  - 5e0ae0d
  - 41233ea
---

# Plan 01-04 Summary: Express API Routes

## What Was Built

Three Express router files providing the API data contract for all dashboard and object browser UI components (Plans 05–07).

## Key Files Created

### created
- `gui/server/routes/dashboard.ts` — GET /api/dashboard
- `gui/server/routes/git.ts` — GET /api/git/recent
- `gui/server/routes/objects.ts` — GET /api/objects, GET /api/objects/:id

### modified
- `gui/server/index.ts` — registered all 3 routers under `/api/*`

## Implementation Notes

**dashboard route:** Aggregates all 5 RBAC system aggregate JSON files (`{system}/{system}.json`) using `readEamJson`. Per-widget error isolation — individual file failures skip that system rather than crashing the endpoint. Returns `hasData: false` with zero-filled shape when no files are found. Parallel fetches for `freshness` and `recentCommits` via `Promise.all`.

**git route:** Thin wrapper around `getRecentPrivilegedEAMCommits(5)`. Service already handles git unavailability by returning `[]`.

**objects route:** Zod v4 `QuerySchema` with `safeParse` — invalid params return 400 `{ error: flatten() }`, never 500. `coerceArray` preprocessor normalizes Express's `string | string[]` query param behaviour to always `string[]`. Filters for tier, rbac, type, pim, onprem, and text search (`q`). Configurable `sortBy`/`sortDir` with `localeCompare`. Page-based pagination (0-indexed). GET `/:id` returns 404 `{ error: 'Not found' }` for unknown IDs.

**Route registration order:** All 3 `/api/*` routes registered before `express.static` and the `/{*splat}` SPA fallback — ensuring API requests are never served the SPA HTML.

## Decisions Made

- Objects pagination is 0-indexed (`page=0` is first page) to match typical REST conventions
- Sorting is string-based via `localeCompare` — sufficient for the current field types

## Requirements Addressed

DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, OBJ-01, OBJ-02, OBJ-03
