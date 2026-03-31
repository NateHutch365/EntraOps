---
phase: 09-exclusions-management
plan: "03"
subsystem: ui
tags: [react, templates, exclusions, read-only]

requires: []
provides:
  - "GlobalExclusionsTab.tsx simplified to read-only display with navigation link to /exclusions"
affects: [templates, exclusions]

tech-stack:
  added: []
  patterns:
    - "Read-only display tabs that link to canonical management pages instead of duplicating mutation UI"

key-files:
  created: []
  modified:
    - gui/client/src/components/templates/GlobalExclusionsTab.tsx

key-decisions:
  - "Kept onSaved?: () => void prop as no-op for TemplatesPage.tsx API compatibility (D-15, D-16)"
  - "UUID Input, Add button, DiffDialog, Save/PUT logic fully removed"
  - "Navigation link styled with text-fluent-accent hover:underline per design system"

patterns-established:
  - "Tab simplification pattern: strip mutation UI, keep read-only fetch + display, add link to canonical page"

requirements-completed:
  - EXCL-01
  - EXCL-02

duration: 5min
completed: 2026-03-31
---

# Phase 09-03: GlobalExclusionsTab Simplified to Read-Only

**Stripped UUID input, Add, DiffDialog, and Save/PUT from GlobalExclusionsTab — now shows a read-only GUID list and "Exclusions page →" navigation link.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-03-31
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments

### Task 1: Simplify GlobalExclusionsTab to read-only

Rewrote `GlobalExclusionsTab.tsx` removing all mutation UI:

**Removed:**
- `inputValue`, `inputError`, `originalExclusions`, `diffOpen`, `saving` state
- `handleAdd()` function
- UUID `<Input>` field and Add `<Button>`
- `<DiffDialog>` component and import
- "Save changes" button and PUT `/api/templates/global` fetch
- `z`, `Trash2`, `Button`, `Input`, `DiffDialog` imports

**Kept:**
- `useEffect` fetching GET `/api/templates/global` → `setExclusions`
- `loading` state + `<Skeleton>` loading UI
- Read-only GUID list display

**Added:**
- `<Link to="/exclusions">` react-router link with "Exclusions page →" text
- `onSaved?: () => void` as no-op prop (TemplatesPage passes `() => setSavedAt(Date.now())`)

## Self-Check: PASSED

- ✓ No UUID Input, Add button, DiffDialog, or Save button in component
- ✓ Shows read-only list of GUIDs from GET /api/templates/global
- ✓ "Manage in Exclusions page →" Link to /exclusions present
- ✓ Loading state with Skeleton retained
- ✓ TypeScript: zero compilation errors
- ✓ TemplatesPage.tsx compatibility maintained via optional onSaved prop
