---
phase: 04-connect-classify-setup
plan: 02
subsystem: api
tags: [express, typescript, sonner, react, sse, zod]

requires:
  - phase: 04-connect-classify-setup plan 01
    provides: connect service (runConnect, disconnectEntraOps, getConnectionStatus, isConnecting) and shared types (AUTH_TYPES, ConnectRequest, ConnectStatus)

provides:
  - POST /api/connect/start SSE endpoint proxying Connect-EntraOps output
  - POST /api/connect/disconnect endpoint returning { disconnected: true }
  - GET /api/connect/status endpoint returning { connected, tenantName }
  - sonner toast library installed with <Toaster /> mounted at App root

affects: [connect-page, classify-setup, frontend-connect-ui]

tech-stack:
  added: [sonner]
  patterns: [SSE route with Zod validation (mirrors commands.ts pattern), toast infrastructure via shadcn sonner wrapper]

key-files:
  created:
    - gui/server/routes/connect.ts
    - gui/client/src/components/ui/sonner.tsx
  modified:
    - gui/server/index.ts
    - gui/client/src/App.tsx

key-decisions:
  - "Replicated commands.ts SSE pattern exactly for consistency"
  - "POST /disconnect collects output before responding (short-lived command, not SSE)"
  - "Toaster added at App root level (outside Routes) so toasts persist across navigation"
  - "ConnectPage route intentionally deferred to Plan 03 to avoid TS errors on missing module"

patterns-established:
  - "Connect SSE route: Zod validate → isConnecting guard → SSE headers → runConnect callback → res.end()"
  - "shadcn sonner installed via `npx shadcn@latest add sonner --yes` in gui/client"

requirements-completed:
  - CONN-01
  - CONN-03

duration: 15min
completed: 2026-03-25
---

# Phase 04: Connect Routes + Sonner Setup Summary

**Exposed connect service as three HTTP endpoints and installed toast infrastructure for the classification wizard.**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-03-25
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `gui/server/routes/connect.ts` with three routes: `POST /start` (SSE), `POST /disconnect` (JSON), `GET /status` (JSON) — mirroring the commands.ts Zod + SSE pattern
- Registered `connectRouter` at `/api/connect` in `gui/server/index.ts`
- Installed sonner via shadcn (`src/components/ui/sonner.tsx`) and mounted `<Toaster />` in App root — provides toast capability for Plan 04 classification completion

## Task Commits

1. **Task 1: Create connect routes and register in Express** - `ccedfdf` (feat)
2. **Task 2: Install sonner and mount Toaster in App** - `5739313` (feat)

## Files Created/Modified
- `gui/server/routes/connect.ts` — Three connect route handlers with Zod validation and SSE streaming
- `gui/server/index.ts` — Added connectRouter import and `/api/connect` mount
- `gui/client/src/components/ui/sonner.tsx` — shadcn-wrapped Toaster component (created by shadcn CLI)
- `gui/client/src/App.tsx` — Added Toaster import and `<Toaster />` after Routes (wrapped in fragment)

## Self-Check: PASSED
- connectRouter imported and mounted in index.ts ✓
- 3 route handlers (POST /start, POST /disconnect, GET /status) in connect.ts ✓
- gui/client/src/components/ui/sonner.tsx exists ✓
- App.tsx contains Toaster import and `<Toaster />` ✓
- TypeScript compiles without errors ✓
