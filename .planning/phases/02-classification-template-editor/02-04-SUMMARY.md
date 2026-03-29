---
plan: 02-04
phase: 02-classification-template-editor
status: complete
completed: 2026-03-25
commit: 940c94d
requirements:
  - TMPL-06
  - TMPL-07
---

# Plan 02-04: Global Exclusions Tab + Save Banner

## What Was Built

Completed Phase 2 with the two remaining requirements:

1. **GlobalExclusionsTab** (`gui/client/src/components/templates/GlobalExclusionsTab.tsx`) — GUID list editor for `Classification/Global.json`. Fetches from `GET /api/templates/global` on mount, renders each exclusion as a row with a Trash2 delete button, validates new GUIDs with Zod UUID schema (inline error on invalid format), and includes a Preview Changes → DiffDialog → Confirm & Save flow against `PUT /api/templates/global`.

2. **SaveBanner** (`gui/client/src/components/templates/SaveBanner.tsx`) — Dismissible amber `Alert` rendered at the top of `TemplatesPage`. Controlled by the existing `savedAt: number` state — reappears on every new save event (even after dismissal), invisible when `savedAt === 0`.

3. **TemplatesPage wiring** — Added imports for both components, removed the `void savedAt` placeholder, replaced the "Global Exclusions coming soon" placeholder with `<GlobalExclusionsTab onSaved={() => setSavedAt(Date.now())} />`, and inserted `<SaveBanner savedAt={savedAt} />` as the first child of the page `<div>`.

## Key Decisions

- Used `JSON.stringify` comparison for the "Preview Changes" disabled state (array reference equality would never work).
- `SaveBanner` effect resets `dismissed` to `false` whenever `savedAt` changes, satisfying the "reappears after next save" requirement.
- Zod v4 `z.string().uuid()` used for UUID validation (consistent with existing Zod usage in Phase 2).

## Verification

- TypeScript build: ✓ built in 334ms (no errors)
- Spot-checks: all expected symbols present in both new files
- Git commit: `940c94d` — 3 files changed, 187 insertions(+), 2 deletions(-)

## Key Files

### Created
- `gui/client/src/components/templates/GlobalExclusionsTab.tsx` — GUID list editor with UUID validation, add/delete handlers, DiffDialog save flow
- `gui/client/src/components/templates/SaveBanner.tsx` — Dismissible amber git-commit reminder banner

### Modified
- `gui/client/src/pages/TemplatesPage.tsx` — Added imports, replaced placeholder tab content, wired SaveBanner

## Issues Encountered

None.
