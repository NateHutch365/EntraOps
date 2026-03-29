---
phase: 08-object-reclassification-screen
plan: "01"
subsystem: shared-types, ui-components, server-tests
tags: [types, select-ui, tdd-red, radix-ui, overrides]
dependency_graph:
  requires: []
  provides:
    - "Override and OverridesResponse types in gui/shared/types/api.ts"
    - "Select UI component at gui/client/src/components/ui/select.tsx"
    - "Failing overrides.test.ts (RED state) at gui/server/routes/overrides.test.ts"
  affects:
    - "gui/server/routes/overrides.ts (Plan 02 will make tests GREEN)"
    - "gui/client/src/pages/ReclassifyPage.tsx (uses Select component)"
    - "gui/client/src/hooks/useOverrides.ts (uses Override/OverridesResponse types)"
tech_stack:
  added: []
  patterns:
    - "radix-ui unified package import (not @radix-ui/react-select)"
    - "TDD RED state: test file imports non-existent module intentionally"
key_files:
  created:
    - gui/client/src/components/ui/select.tsx
    - gui/server/routes/overrides.test.ts
  modified:
    - gui/shared/types/api.ts
decisions:
  - "Import Select from 'radix-ui' unified package consistent with all other ui/ components"
  - "7 test cases (3 GET + 4 POST) cover all expected overrides.ts behaviors for Plan 02"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-28"
  tasks_completed: 3
  files_changed: 3
---

# Phase 8 Plan 01: Wave 0 Prerequisites Summary

**One-liner:** Shared Override types, radix-ui Select component, and 7 failing TDD tests for /api/overrides GET and POST in RED state.

## What Was Built

Three Wave 0 prerequisites needed by all downstream Phase 8 plans:

1. **Override + OverridesResponse types** appended to `gui/shared/types/api.ts` — shared between server route and client hook without duplication.

2. **Select UI component** (`gui/client/src/components/ui/select.tsx`) scaffolded from the radix-ui unified package, matching the project's accordion.tsx pattern exactly. Exports 8 named sub-components: `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`.

3. **Failing overrides.test.ts** (RED state) with 7 test cases covering all expected behaviors of the overrides route that Plan 02 will implement:
   - GET: empty file (ENOENT → `{overrides:[]}`)
   - GET: valid JSON → parsed overrides
   - GET: invalid JSON → `{overrides:[]}`
   - POST: valid payload → `{ok:true}` with atomic writeFile+rename
   - POST: empty array → `{ok:true}`
   - POST: invalid OverrideTierLevelName → 400
   - POST: missing `overrides` field → 400
   - POST: non-array `overrides` → 400 (8th case)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 — Shared types | `531d49c` | feat(08-01): add Override and OverridesResponse shared types |
| 2 — Select component | `96e1c50` | feat(08-01): scaffold Select UI component from radix-ui unified package |
| 3 — Test stubs (RED) | `76e50da` | test(08-01): add failing overrides.test.ts (RED state) |

## Verification

- `grep "export interface Override" gui/shared/types/api.ts` → line 130 ✅
- `grep "export interface OverridesResponse" gui/shared/types/api.ts` → line 135 ✅
- `grep 'from "radix-ui"' gui/client/src/components/ui/select.tsx` → confirmed ✅
- `cd gui && npx tsc --noEmit` → zero errors ✅
- `cd gui/server && npx vitest run routes/overrides.test.ts` → **FAILS** (expected RED state — overrides.ts missing) ✅

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan only creates types, a UI component, and failing tests. No data stubbing.

## Self-Check: PASSED

- `gui/shared/types/api.ts` — Override/OverridesResponse present ✅
- `gui/client/src/components/ui/select.tsx` — file exists ✅
- `gui/server/routes/overrides.test.ts` — file exists ✅
- Commits `531d49c`, `96e1c50`, `76e50da` verified in git log ✅
