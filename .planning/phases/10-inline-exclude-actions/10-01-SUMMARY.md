---
phase: 10-inline-exclude-actions
plan: "01"
subsystem: api
tags: [typescript, zod, express, react, hooks]

requires:
  - phase: 09-exclusions-management
    provides: GET/DELETE /api/exclusions, Global.json atomicWrite pattern, useExclusions hook (original)

provides:
  - POST /api/exclusions endpoint (201/400/404/409/500 response shapes)
  - Updated useExclusions hook fetching from /api/exclusions with addExclusion(guid) mutation

affects: [10-02, 10-03, any code importing useExclusions]

tech-stack:
  added: []
  patterns:
    - POST handler mirrors DELETE handler pattern (same Zod validation, atomicWrite, error shapes)
    - addExclusion returns void, resolves on 201 or 409, throws on all other errors

key-files:
  created: []
  modified:
    - gui/server/routes/exclusions.ts
    - gui/client/src/hooks/useExclusions.ts

key-decisions:
  - "409 treated as non-error in addExclusion — already excluded is idempotent success from UX perspective"
  - "ExclusionResponse interface defined in hook (not shared types) — sufficient for client-only use"
  - "addExclusion calls invalidate() after 201 or 409 to keep exclusion Set current"

patterns-established:
  - "POST body validated with PostBodySchema = z.object({ guid: z.string().uuid() })"
  - "useExclusions returns addExclusion(guid) that POSTs then invalidates — mirrors ReactQuery mutation pattern"

requirements-completed:
  - EXCL-04
  - EXCL-05

duration: 15min
completed: 2026-04-02
---

# Phase 10-01: POST /api/exclusions + useExclusions mutation

**Added POST endpoint for excluding principals and extended useExclusions hook with addExclusion mutation gate for Wave 2 plans.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-04-02
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- POST /api/exclusions handler with Zod validation, 400/404/409/500/201 response shapes, atomicWrite to Global.json
- useExclusions now fetches from /api/exclusions (not /api/templates/global), builds Set from item.guid.toLowerCase()
- addExclusion(guid) added: POSTs to /api/exclusions, resolves on 201 or 409, throws on other errors, calls invalidate()

## Task Commits

1. **Task 1 + Task 2: POST endpoint + hook update** - `3abcad3` (feat)

## Files Created/Modified
- `gui/server/routes/exclusions.ts` - Added PostBodySchema and router.post() handler
- `gui/client/src/hooks/useExclusions.ts` - Updated URL, added ExclusionResponse interface, added addExclusion

## Decisions Made
- addExclusion treats 409 as success (idempotent exclude) — throws only on non-ok non-409 responses

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Plans 10-02 and 10-03 can now import useExclusions and destructure addExclusion alongside exclusions Set.
The POST /api/exclusions contract is live — ObjectBrowser and ReclassifyPage can wire their handleExclude callbacks.

---
*Phase: 10-inline-exclude-actions*
*Completed: 2026-04-02*
