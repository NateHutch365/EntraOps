---
created: 2026-03-25T17:12:55.513Z
title: Fix path traversal returning 400 instead of 403
area: api
files:
  - gui/server/routes/templates.ts
---

## Problem

When a path traversal string (e.g. `../../../etc/passwd`) is passed as the `:name` param to `GET /api/templates/:name` or `PUT /api/templates/:name`, the server returns `400` (unknown template name) instead of `403` (forbidden). The allowlist check fires before `assertSafePath`, so traversal attempts are blocked but get the semantically incorrect status code.

Security is not compromised — the allowlist prevents traversal entirely. This is purely an HTTP semantics issue.

Found during Phase 2 verification audit (truth #4 in 02-VERIFICATION.md).

## Solution

Reorder the guards in `gui/server/routes/templates.ts` so `assertSafePath` runs first:
1. `assertSafePath(name)` → returns `403` if path traversal detected
2. `TEMPLATE_NAMES.includes(name)` → returns `400` if unknown template

This gives correct HTTP semantics: `403` for security violations, `400` for bad input.
