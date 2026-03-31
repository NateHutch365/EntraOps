---
plan: 09-01
phase: 09-exclusions-management
status: complete
completed: 2026-03-31
---

## Summary

Created the backend API for Exclusions Management — two endpoints (GET + DELETE) wired into the Express server.

## What Was Built

**GET /api/exclusions**
- Reads `Classification/Global.json` → extracts `[0].ExcludedPrincipalId[]`
- Builds a lookup Map from all `PrivilegedEAM/**/*.json` files (single objects and arrays supported) keyed on `ObjectId.toLowerCase()`
- Returns `ExclusionItem[]` with `guid`, `displayName`, `objectType`, `resolved` fields
- Returns `[]` gracefully when `Global.json` is missing or PrivilegedEAM directory is absent

**DELETE /api/exclusions/:guid**
- Validates `:guid` as UUID via Zod — 400 on invalid
- Returns 404 if `Global.json` missing or GUID not found
- Atomic removal using `atomicWrite` utility — 204 on success

**Server wiring**
- Import + mount added to `gui/server/index.ts` at `/api/exclusions`

## Key Files

key-files.created:
- gui/server/routes/exclusions.ts
key-files.modified:
- gui/server/index.ts

## Decisions

- Used `GlobalFileSchema` (Zod tuple + rest) to safely destructure `[0].ExcludedPrincipalId` from Global.json
- Case-insensitive GUID comparison throughout (`.toLowerCase()`) to handle inconsistent casing
- `buildNameLookup` wraps entire PrivilegedEAM scan in try/catch — missing directory returns empty Map instead of 500
- No `assertSafePath` wrapping needed — Global.json is a fixed path, not user-supplied input

## Verification

- TypeScript: zero compilation errors (`npx tsc --noEmit`)
- Commit: `1b829a7`
