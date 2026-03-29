---
phase: 02-classification-template-editor
plan: 03
subsystem: ui
tags: [react, shadcn, tailwind, zod, chips, diff, accordion, fetch]

requires:
  - phase: 02-classification-template-editor
    provides: TierAccordion read-only shell, DiffDialog component, TemplatesPage with tab+fetch architecture

provides:
  - ChipEditor component — controlled pill-chip editor for string[] actions list with add/remove
  - TierAccordion with full interactive edit surface per entry (ChipEditor + Preview Changes + Zod gate + DiffDialog)
  - Preview→Diff→Confirm→Save flow calling PUT /api/templates/:name
  - TemplatesPage savedAt state wired and ready for plan 02-04 SaveBanner
  - Client-side zod@4.3.6 installed

affects: [02-04-global-exclusions-save-banner]

tech-stack:
  added: [zod@4.3.6 (client-side)]
  patterns:
    - "Per-entry dirty state map keyed by 'tierIdx-entryIdx' string — avoids one state array per entry, works for arbitrary accordion depths"
    - "Zod validation gate before dialog open — structural check runs on Preview Changes click, sets inline error instead of opening dialog if invalid"
    - "IIFE pattern for DiffDialog render — extracts indices from diffOpen key, builds proposedTiers inline without extra state"
    - "void savedAt sentinel — satisfies noUnusedLocals for forward-declared state that will be read by a future plan's component"

key-files:
  created:
    - gui/client/src/components/templates/ChipEditor.tsx
  modified:
    - gui/client/src/components/templates/TierAccordion.tsx
    - gui/client/src/pages/TemplatesPage.tsx
    - gui/client/package.json

key-decisions:
  - "Per-entry dirty state map (Record<string, string[]>) keyed by 'tierIdx-entryIdx' — clean lookup without array of state objects"
  - "ChipEditor silently ignores empty and duplicate additions — no error state needed; placeholder text communicates intent"
  - "void savedAt pattern used instead of _savedAt prefix — preserves final variable name for plan 02-04 without noUnusedLocals error"
  - "Robust error handling for non-JSON PUT responses: try/catch around res.json() in error path, falls back to HTTP status string"

patterns-established:
  - "Dirty state map pattern: Record<'tierIdx-entryIdx', T> for per-card mutable state in accordion lists"
  - "Preview-gate pattern: validate → if invalid show inline error → else open dialog (never open dialog with invalid data)"

requirements-completed:
  - TMPL-03
  - TMPL-04
  - TMPL-05

duration: 20min
completed: 2026-03-25
---

# Phase 02 Plan 03: ChipEditor + Preview/Diff/Save Flow Summary

**Chip-based RoleDefinitionActions editor wired into TierAccordion with Zod-gated preview, unified JSON diff, and atomic PUT save — completing the full inline edit cycle for template entries.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-25T16:36:21Z
- **Completed:** 2026-03-25T16:56:00Z
- **Tasks:** 2 completed
- **Files modified:** 3 (+ 1 created)

## Accomplishments

- `ChipEditor.tsx` — standalone controlled component; dismissible pill chips per action string with × remove; add-input with Enter/button support; silently skips empty and duplicate inputs
- `TierAccordion.tsx` rewritten to full editing mode: per-entry `dirtyActions` map, Zod validation gate, `DiffDialog` integration, PUT /api/templates/:name on confirm
- `TemplatesPage.tsx` updated: passes `templateName` + `onSaved` to TierAccordion; `savedAt` state added and ready for plan 02-04's SaveBanner

## Task Commits

1. **Task 1: ChipEditor component** — `92a72e8` (feat)
2. **Task 2: TierAccordion edit surface + Preview→Diff→Save flow** — `cceb74e` (feat)

## Files Created/Modified

- `gui/client/src/components/templates/ChipEditor.tsx` — Controlled pill chip editor for string[] with add/remove
- `gui/client/src/components/templates/TierAccordion.tsx` — Full edit surface: ChipEditor per entry, Preview Changes, Zod gate, DiffDialog, PUT save
- `gui/client/src/pages/TemplatesPage.tsx` — Added savedAt state; passes templateName + onSaved to TierAccordion
- `gui/client/package.json` — Added zod@4.3.6 dependency

## Decisions Made

- **Dirty state map keyed by `"tierIdx-entryIdx"`** — avoids managing an array of per-entry state objects; simple string key lookup works cleanly with the accordion's index-based rendering
- **`void savedAt` over `_savedAt`** — preserves the canonical variable name for plan 02-04's SaveBanner without triggering `noUnusedLocals`; standard TS idiom for forward-declared state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Error Handling] Robust non-JSON error handling for PUT failure path**
- **Found during:** Task 2 (TierAccordion edit surface)
- **Issue:** Plan's `!res.ok` handler called `await res.json()` directly — will throw if server returns a non-JSON error body (e.g., 500 with HTML)
- **Fix:** Wrapped `res.json()` in try/catch; falls back to `HTTP ${res.status}` string as error message
- **Files modified:** `gui/client/src/components/templates/TierAccordion.tsx`
- **Committed in:** `cceb74e`

**2. [Rule 3 - Blocking Build Issue] `savedAt` causes noUnusedLocals TS error**
- **Found during:** Task 2 (TemplatesPage.tsx update)
- **Issue:** `noUnusedLocals: true` in client tsconfig.json — `savedAt` is declared but not yet read (02-04 will add SaveBanner)
- **Fix:** Added `void savedAt; // consumed by SaveBanner in plan 02-04` below the state declaration
- **Files modified:** `gui/client/src/pages/TemplatesPage.tsx`
- **Committed in:** `cceb74e`

---

**Total deviations:** 2 auto-fixed (1× Rule 2, 1× Rule 3)
**Impact on plan:** Both fixes necessary for correctness and build viability. No scope creep.

## Issues Encountered

None — plan executed cleanly with the two auto-fixes above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 02-04 (Global Exclusions + SaveBanner) can proceed immediately:
- `savedAt` state is in TemplatesPage, ready to drive the SaveBanner's display logic
- `DiffDialog` is used and verified working end-to-end
- `PUT /api/templates/:name` integration is tested through the TierAccordion save flow

---
*Phase: 02-classification-template-editor*
*Completed: 2026-03-25*
