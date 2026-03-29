---
phase: 04-connect-classify-setup
plan: 01
subsystem: api
tags: [typescript, spawn, powershell, connect, types]

requires: []
provides:
  - "ConnectRequest, ConnectStatus, AUTH_TYPES, AuthType — shared type contracts for connect feature"
  - "runConnect() — spawns Connect-EntraOps with TenantName + AuthenticationType, sets connectionState on exit 0"
  - "disconnectEntraOps() — spawns Disconnect-EntraOps, always resets connectionState"
  - "getConnectionStatus() / isConnecting() — read-only state accessors"
affects:
  - 04-02
  - connect-routes
  - connect-ui

tech-stack:
  added: []
  patterns:
    - "Module-scope session state (connectionState, connectProcess) — intentionally not persisted across server restarts"
    - "shell: false on all spawn calls — SECURITY requirement, prevents metacharacter injection"
    - "connectionState only set to connected:true when proc close code === 0"
    - "disconnectEntraOps always resets state in both close and error handlers"

key-files:
  created:
    - gui/shared/types/connect.ts
    - gui/server/services/connect.ts
  modified: []

key-decisions:
  - "Session-scoped state only (no persistence) — per CONTEXT.md decision B"
  - "Reuse CommandRunEvent from commands.ts for SSE callbacks — no new event type needed"
  - "SIGTERM sent to any in-progress connectProcess before spawning Disconnect-EntraOps"

patterns-established:
  - "Connect service mirrors commands.ts structure: REPO_ROOT derivation, module-scope process var, shell:false"

requirements-completed:
  - CONN-02

duration: 5min
completed: 2026-03-25
---

# Phase 04-01: Connect Types + Server Service Summary

**Established type contracts and session-scoped process management for Connect/Disconnect-EntraOps, with shell-injection security and state-on-success-only semantics.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-03-25
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `gui/shared/types/connect.ts` with AUTH_TYPES const, AuthType alias, ConnectRequest and ConnectStatus interfaces
- Created `gui/server/services/connect.ts` with full process lifecycle management — spawn, state tracking, cleanup
- Both spawns use `shell: false` (security); connectionState only set connected:true on exit code 0

## Task Commits

1. **Task 1 + Task 2: Connect types and service** - `95159bc` (feat)

## Files Created/Modified
- `gui/shared/types/connect.ts` — Shared type contracts for the connect feature (client + server)
- `gui/server/services/connect.ts` — Server service: spawn Connect/Disconnect-EntraOps, track session state

## Decisions Made
None - followed plan as specified. Reused CommandRunEvent from commands.ts as planned.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. TypeScript compiled without errors on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Plan 04-02 can now import from `gui/server/services/connect.ts` to mount HTTP routes (`/api/connect/start`, `/api/connect/status`, `/api/connect/disconnect`). All 4 exported functions are available.

---
*Phase: 04-connect-classify-setup*
*Completed: 2026-03-25*
