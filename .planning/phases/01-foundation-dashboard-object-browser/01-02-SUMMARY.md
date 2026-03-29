---
plan: 01-02
phase: 01-foundation-dashboard-object-browser
status: complete
completed: 2026-03-24
commits:
  - 8c0a544
  - 3c52a3f
---

# Plan 01-02 Summary: Express Server + Security Baseline

## What Was Built

Created the Express v5 server with a full OWASP security baseline, plus the two data-access services that all API routes depend on.

The server (`index.ts`) binds exclusively to `127.0.0.1:3001` (never `0.0.0.0`), applies `helmet()` then `securityMiddleware` before any route, and uses Express v5's `/{*splat}` wildcard syntax (not `/*` which crashes v5 at startup) for the SPA fallback.

The security middleware (`security.ts`) blocks DNS-rebinding attacks by rejecting any `Host` header not in `{localhost, 127.0.0.1, ::1}`, provides a factory-based path traversal guard using `path.resolve()` + `startsWith()`, and a 4-arg error handler that never exposes stack traces.

The EAM reader (`eamReader.ts`) strips the UTF-8 BOM (`\uFEFF`) that PowerShell writes at the start of every JSON file before calling `JSON.parse`. It caches parsed data keyed by `(filePath, mtimeMs)` with a 5-minute TTL to avoid re-reading unchanged files on every request. Files exceeding the 50 MB threshold are parsed with stream-json's `withParserAsStream()` pipeline.

The git log service (`gitLog.ts`) uses `simple-git` to query the last N commits touching `PrivilegedEAM/`, returning an empty array (never throwing) when git is unavailable.

## Key Files Created

### key-files
created:
  - gui/server/index.ts — Express v5 app: helmet → securityMiddleware → future API routes → SPA fallback → error handler; binds to 127.0.0.1:3001
  - gui/server/middleware/security.ts — securityMiddleware (DNS-rebinding guard), assertSafePath (path traversal factory), errorHandler (4-arg, no stack traces)
  - gui/server/services/eamReader.ts — readEamJson: BOM stripping, mtime-based cache (5min TTL), stream-json fallback for >50MB files; clearEamCache export
  - gui/server/services/gitLog.ts — getRecentPrivilegedEAMCommits: simple-git log for PrivilegedEAM/ path, returns [] on git failure
  - gui/server/vitest.config.ts — vitest config for server tests (globals, node environment)
  - gui/server/src/__tests__/security.test.ts — 7 tests covering securityMiddleware (localhost/127.0.0.1/evil.com), assertSafePath (valid/traversal/deep), errorHandler (no stack leak)
  - gui/server/src/__tests__/eamReader.test.ts — 3 tests covering BOM-free parsing, BOM stripping, and mtime-based cache hit

## Decisions Made

- **GitCommit type inlined in gitLog.ts**: Cross-workspace relative import `../../shared/types/api.js` would require TypeScript composite project referencing that wasn't configured in this plan. Inlined the 4-field interface — matches `gui/shared/types/api.ts` exactly. Plan 04 routes can use the shared type directly.
- **stream-json v2 via dynamic import**: `@types/stream-json@1.7.8` covers v1 API paths (PascalCase `StreamArray`). Package is v2 with snake-case paths. Used `import()` at call time to avoid module-load type conflicts. The streaming path is only exercised for files >50 MB; tests mock `fs` entirely.
- **`vi.clearAllMocks()` added to all `beforeEach`**: Without clearing, mock call counts accumulated across `describe` blocks causing the caching test to falsely see 3 `readFile` calls.
- **STREAM_THRESHOLD exported**: Made `export const` so it can be referenced in tests if needed and confirms the 50 MB constant is present.

## Verification Results

All checks passed:
- ✓ `grep '127.0.0.1' gui/server/index.ts` — binding present
- ✓ `grep 'helmet()' gui/server/index.ts` — helmet before routes
- ✓ `grep 'securityMiddleware' gui/server/index.ts` — middleware applied
- ✓ `/{*splat}` wildcard present (not `/*`)
- ✓ `grep 'uFEFF' gui/server/services/eamReader.ts` — BOM check present
- ✓ `grep 'STREAM_THRESHOLD' gui/server/services/eamReader.ts` — 50 MB constant present
- ✓ `grep 'simpleGit' gui/server/services/gitLog.ts` — simple-git, not child_process
- ✓ `npm test -w server -- --run` → 10/10 tests pass (2 test files)
- ✓ No stack trace field in errorHandler response (grep on comment only)

## Self-Check: PASSED

All must_haves satisfied:
- Express server starts on 127.0.0.1 ✓
- Requests with Host: evil.com return 400 (DNS rebinding protection) ✓ (tested)
- Path traversal via ../../ returns 403 ✓ (tested, assertSafePath throws with status:403)
- UTF-8 BOM stripped before JSON.parse ✓ (tested)
- Files >50MB streamed via stream-json ✓ (STREAM_THRESHOLD = 50MB, streamParseJson)
- mtime-based cache (no re-read on unchanged mtime) ✓ (tested)
- Stack traces never in error responses ✓ (errorHandler sends only err.message)
