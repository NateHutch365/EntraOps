---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Self-Service Implementation Workflow
status: defining requirements
last_updated: "2026-03-29T00:00:00.000Z"
last_activity: 2026-03-29 — Milestone v1.2 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** A user who has run `Save-EntraOpsPrivilegedEAMJson` can open a browser and immediately understand who holds ControlPlane access in their tenant — without writing a KQL query, opening Azure Portal, or reading raw JSON.
**Current state:** v1.2 in planning — Self-Service Implementation Workflow. Run `/gsd-plan-phase` to start execution once roadmap is set.

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-29 — Milestone v1.2 started

## Performance Metrics

**Velocity:**

- Total plans completed: 2
- Average duration: ~25 min/plan
- Total execution time: ~50 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 (partial) | 2/5 | ~50 min | ~25 min |

**Recent Trend:**

- Last 5 plans: 02-01 (25 min), 02-02 (25 min)
- Trend: Consistent

*Updated after each plan completion*
| Phase 02-classification-template-editor P03 | 20 | 2 tasks | 4 files |
| Phase 02-classification-template-editor P05 | 5 | 2 tasks | 1 files |
| Phase 04-connect-classify-setup P04 | 45 | 1 tasks | 1 files |
| Phase 05 P04 | 20 | 2 tasks | 5 files |
| Phase 08-object-reclassification-screen P01 | 2 | 3 tasks | 3 files |
| Phase 08-object-reclassification-screen P02 | 8 | 2 tasks | 2 files |
| Phase 08-object-reclassification-screen P03 | 2 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Key decisions affecting Phase 1:

- **Tailwind v4** (not v3): CSS-first config, `@theme` block replaces `tailwind.config.js` — different setup than most tutorials
- **Express v5** (not v4): async middleware, different error handler signature
- **Zod v4** (not v3): current npm default; 14× faster; API is slightly different from v3 examples
- **Node.js 22 minimum**: v20 EOL as of March 2026
- **React Router v7 required**: PRD omitted this; needed for OBJ-04 (URL-reflected filter state) — must be in Phase 1
- **shadcn/ui instead of Fluent UI v9**: Fluent's Griffel CSS-in-JS conflicts with Tailwind; Fluent aesthetic via CSS custom properties in `@theme` block
- **Server-side pagination**: browser never receives the full dataset; all filtering/slicing in Express — required for large tenants
- **Atomic template writes**: temp file → rename pattern to avoid partial writes on crash
- [Phase 02-classification-template-editor]: DiffDialog cosmetic overflow is non-blocking: affects large templates in small windows, captured as polish todo
- [Phase 02-classification-template-editor]: All 7 TMPL requirements human-verified in browser before Phase 2 closed
- [Phase 04-connect-classify-setup]: Each pwsh spawn is isolated: Az/MgGraph tokens must be forwarded to classify process via AlreadyAuthenticated env vars
- [Phase 04-connect-classify-setup]: Import-Module and subsequent cmdlet calls must be separated by semicolon — missing separator causes cmdlet name to be parsed as Import-Module argument
- [Phase 05]: useCompare aggregates 5 parallel compare API calls (per-system endpoint requires rbac param)
- [Phase 08-01]: Import Select from 'radix-ui' unified package consistent with all other ui/ components
- [Phase 08-object-reclassification-screen]: fs.mkdir recursive guard in POST protects against missing Classification/ directory
- [Phase 08-object-reclassification-screen]: Inner try/catch in GET swallows ENOENT and JSON.parse errors silently — returns empty overrides array
- [Phase 08-03]: refreshKey pattern (not TanStack Query) matches existing useObjects.ts convention
- [Phase 08-03]: empty string sentinel for Select maps to null in pending Map — avoids undefined ambiguity
- [Phase 08-04]: Radix SelectItem rejects empty-string value — use `__none__` sentinel constant and convert to null on save
- [Phase 08-04]: pageSize cap raised 200 → 10000 on GET /api/objects for bulk-load admin screens

### Phase 2 Decisions (02-01 + 02-02)

- **TEMPLATE_NAMES constant inlined in routes file**: avoids cross-workspace ESM resolution issues
- **Zod v4 z.string().uuid() strict RFC compliance**: test GUIDs must use version 4 format
- **Global endpoint returns { exclusions: [] } not 404**: simplifies client handling when Global.json missing
- **DiffDialog uses diffLines() from diff package**: renders Change objects as span blocks with bg-green-950/bg-red-950
- **TemplatesPage activeTab is TemplateName | 'global'**: fetch effect has early-return guard for 'global' tab
- **diff + @testing-library/jest-dom installed in client workspace**

### Phase 2 Decisions (02-03)

- **Dirty state map keyed by 'tierIdx-entryIdx'**: per-entry edits in TierAccordion without managing an array of state objects — clean string-key lookup
- **void savedAt pattern**: satisfies noUnusedLocals while preserving variable name for plan 02-04 SaveBanner (avoids renaming later)
- **ChipEditor silently ignores empty/duplicate additions**: no error state needed; placeholder text communicates intent
- **Robust PUT error handling**: try/catch around res.json() in error path — falls back to HTTP status string for non-JSON error bodies

### Pending Todos

- **Object-Level Reclassification** (`2026-03-26-object-level-reclassification.md`) — post-classification review screen for overriding individual object tier assignments inline. Deferred from Phase 5.5 to next milestone.

### Blockers / Concerns

- **Windows cross-platform testing must be verified in Phase 1**: macOS dev will mask path separator issues (backslash vs forward-slash, BOM on UTF-8 JSON). Must strip `\uFEFF` before `JSON.parse()` and normalize all paths to forward-slashes before sending to the client.
- **Large `PrivilegedEAM/` file handling**: async reads + in-memory cache (mtime-invalidated, 5-min TTL) required to avoid blocking the Express event loop. Files ≥300 MB will need `stream-json` streaming parser — detect by file size on first load.
- **Express must bind to `127.0.0.1` explicitly**: `app.listen(PORT)` binds to all interfaces. On a corporate laptop, the API becomes accessible to other machines. Add `Host` header validation middleware for DNS rebinding protection.
- **Path traversal guards required on all file routes**: `path.join()` does NOT prevent traversal — it resolves `../` cleanly. Every file-read and file-write endpoint must assert `resolved.startsWith(BASE + path.sep)` after resolving.

## Session Continuity

Phase 8 (Object Reclassification Screen) complete (2026-03-28). All 4 plans done, all 5 RECL requirements human-verified in browser.

Milestone v1.1 (Pre-Apply Intelligence) complete. Run `/gsd-complete-milestone` to archive and prepare for next milestone.
