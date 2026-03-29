---
phase: 05-git-change-history
plan: 02
subsystem: api
tags: [typescript, express, zod, git-history, rbac]

requires: [05-01]
provides:
  - "GET /api/git/commits — paginated commit list with total count (HIST-01)"
  - "GET /api/git/commits/:hash/systems — RBAC systems affected by commit"
  - "GET /api/git/commits/:hash/changes?rbac=X — structured change summary per RBAC system (HIST-02, HIST-03)"
  - "GET /api/git/compare?from=X&to=Y&rbac=Z — two-commit comparison with structured diff (HIST-04)"
affects: [05-03, 05-04]

tech-stack:
  added: []
  patterns:
    - "Inline coerceArray helper (not imported cross-route) — same pattern as objects.ts"
    - "/compare defined before /:hash routes to prevent Express param capture"
    - "All routes use Zod safeParse, return 400 on validation failure"
    - "Express v5 async handlers — no explicit error wrapping needed"

key-files:
  modified:
    - gui/server/routes/git.ts

key-decisions:
  - "/compare route placed before /:hash routes — prevents Express treating 'compare' as a hash param"
  - "coerceArray inlined rather than imported — avoids cross-route coupling"

patterns-established:
  - "Zod schemas named by route (CommitsQuerySchema, ChangesQuerySchema, CompareQuerySchema)"
  - "All service functions imported from gitHistory.js — no direct git calls in routes"

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-04]

duration: 2min
completed: 2026-03-26
---

# Phase 05-02: Git API Routes Summary

**4 REST endpoints added to existing git router exposing the Phase 5 gitHistory service to client consumers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T17:14:00Z
- **Completed:** 2026-03-26T17:15:31Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Extended `gui/server/routes/git.ts` with 4 new route handlers for Phase 5
- All routes validated with Zod schemas; invalid params return 400 with flattened error
- Existing `GET /api/git/recent` route preserved unchanged
- `/compare` route placed before `/:hash` routes to prevent Express param capture

## Task Commits

1. **Task 1: Add 4 API endpoints to git router for Phase 5** — `695ecf2` (feat)

## Files Created/Modified
- `gui/server/routes/git.ts` — 4 new Phase 5 route handlers added; existing /recent preserved

## Decisions Made
- Reused inline `coerceArray` helper rather than creating a shared module — avoids cross-route coupling for a 4-line utility
- Route ordering: `/compare` then `/commits`, then `/:hash` sub-routes — safe param resolution
