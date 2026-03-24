---
plan: 01-01
phase: 01-foundation-dashboard-object-browser
status: complete
completed: 2026-03-24
commits:
  - 17bc40b
  - f2a5e27
  - f45c307
---

# Plan 01-01 Summary: Monorepo Scaffold & Shared Types

## What Was Built

Created the `gui/` npm workspaces monorepo scaffold with all foundational files required by every subsequent plan in Phase 1.

## Key Files Created

### key-files
created:
  - gui/package.json — workspace root with npm workspaces (client/server/shared), concurrently dev script
  - gui/client/package.json — React 19, Vite 8, Tailwind v4, TanStack Table, recharts, nuqs, all pinned versions
  - gui/server/package.json — Express 5.2.1, helmet, simple-git, stream-json, zod; tsx watch dev script
  - gui/shared/package.json — minimal shared package
  - gui/tsconfig.json — composite root references client/server/shared
  - gui/client/tsconfig.json — bundler module resolution, JSX react-jsx, paths alias @/*
  - gui/server/tsconfig.json — NodeNext module resolution, ESM
  - gui/shared/tsconfig.json — NodeNext, declaration output
  - gui/shared/types/eam.ts — EamTier, RbacSystem, PrivilegedObject, RoleAssignment, Classification interfaces
  - gui/shared/types/api.ts — DashboardResponse, ObjectsResponse, ObjectsQuery, GitCommit, TierCounts
  - gui/shared/types/index.ts — re-exports all from eam.ts and api.ts
  - gui/client/vite.config.ts — @tailwindcss/vite plugin, /api proxy to 127.0.0.1:3001, vitest jsdom config
  - gui/client/index.html — standard Vite HTML entry
  - gui/client/src/main.tsx — StrictMode + BrowserRouter + NuqsAdapter (react-router/v7 adapter)
  - gui/client/src/App.tsx — stub component
  - gui/client/src/test-setup.ts — vitest setup with @testing-library/jest-dom

## Decisions Made

- Server dev script uses `tsx watch index.ts` (files at `gui/server/*.ts`, no src/ prefix)
- NuqsAdapter imported from `nuqs/adapters/react-router/v7` (not deprecated `/react-router`)
- Vite proxy uses `changeOrigin: false` targeting `http://127.0.0.1:3001`
- All shared type relative imports use `.js` extensions (NodeNext module resolution requirement)

## Verification Results

All plan verification checks passed:
- ✓ Workspace structure: all 4 package.json files exist
- ✓ Workspaces field present in gui/package.json
- ✓ Concurrently dev script present
- ✓ NuqsAdapter from `nuqs/adapters/react-router/v7`
- ✓ Shared type files: eam.ts, api.ts, index.ts
- ✓ `tailwindcss()` in vite plugins
- ✓ Proxy target `127.0.0.1:3001`

## Self-Check: PASSED

All must_haves satisfied:
- gui/ with client/, server/, shared/ exists ✓
- npm workspaces configured ✓
- Shared types compile (no TS syntax errors detected) ✓
- Vite config has Tailwind v4 plugin and proxy ✓
- NuqsAdapter uses correct v7 adapter path ✓
