---
phase: 06-settings-polish
plan: 03
subsystem: ui
tags: [react, typescript, zod, tailwind, vitest, lucide-react]

requires: [06-01, 06-02]
provides:
  - Complete SettingsPage at gui/client/src/pages/SettingsPage.tsx (replaces stub)
  - ConfigForm component with 5 section cards, view/edit toggle, sticky header, DiffDialog, SaveBanner
  - ConfigEmptyState with live PowerShell command generator and clipboard copy
  - CronPicker with 5 dropdowns and human-readable preview
  - describeCron() utility with 8 unit tests — all passing
affects: [06-settings-polish]

tech-stack:
  added: []
  patterns:
    - "Toggle-controlled sections use disabled={!isEditing || !parentToggle} pattern for sub-field greying"
    - "updateNestedDraft<K, NK> helper handles all nested EntraOpsConfig mutation safely"
    - "Client-side Zod validation with configDraftSchema.safeParse before opening DiffDialog"
    - "CronPicker is fully controlled — no local state, parent holds the cron string"
    - "ConfigEmptyState uses useMemo for live command generation"

key-files:
  created:
    - gui/client/src/lib/cron.ts
    - gui/client/src/lib/cron.test.ts
    - gui/client/src/components/settings/CronPicker.tsx
    - gui/client/src/components/settings/ConfigForm.tsx
    - gui/client/src/components/settings/ConfigEmptyState.tsx
  modified:
    - gui/client/src/pages/SettingsPage.tsx

key-decisions:
  - "No Switch component in codebase — used Checkbox from @/components/ui/checkbox for all boolean toggles"
  - "No Select component in codebase — used native <select> styled with Tailwind to match Input component"
  - "Tooltip for read-only fields implemented via <span title='...'> wrapper around Lock icon (lucide title prop not typed)"
  - "updateNestedDraft uses Record<PropertyKey, unknown> cast to allow spreading EntraOpsConfig nested objects"
  - "configDraftSchema defined inline in ConfigForm — includes cronString refine for 5-field validation"

patterns-established:
  - "Fully controlled CronPicker: parse value prop → local part extraction → reconstruct on change → call onChange"
  - "Settings form state: diskConfig (disk truth) + draft (editing copy) + isEditing flag — isDirty computed inline"

requirements-completed: [SETT-01, SETT-02, SETT-03]

duration: 20min
completed: 2026-03-26
---

# Phase 06-03: Settings Polish — Complete SettingsPage UI

**Full settings UI: ConfigForm with 5 section cards, view/edit mode, CronPicker, DiffDialog save flow, SaveBanner, ConfigEmptyState with live PowerShell command generator.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 completed
- **Files:** 5 created, 1 modified

## Accomplishments

### Task 1: SettingsPage + ConfigForm + CronPicker + describeCron

**cron.ts** — `describeCron(cron: string): string` utility covering common patterns (every minute, hourly, daily, weekly, monthly, yearly) with ordinal suffixes. `CRON_OPTIONS` constant provides dropdown options for all 5 cron fields.

**cron.test.ts** — 8 vitest unit tests including edge cases (non-5-field strings, unusual combinations). All passing.

**CronPicker.tsx** — Fully controlled component. Parses the `value` prop into 5 parts on each render, reconstructs on dropdown change, calls `onChange`. Shows `describeCron` preview below dropdowns. Uses native `<select>` styled with Tailwind (no `Select` shadcn component exists).

**SettingsPage.tsx** (overwrote stub) — State: `diskConfig`, `draft`, `isEditing`, `savedAt`, `configExists`, `fetchTrigger`. `isDirty` computed inline. `handleSave` calls `PUT /api/config`, handles 200 (update state + savedAt) and 422 (toast error with Zod issue paths). Routes to ConfigEmptyState when config missing, ConfigForm when config exists.

**ConfigForm.tsx** — 5 section cards:
1. **Identity & Auth**: TenantId/TenantName as read-only (Lock icon + `<span title>`), AuthenticationType/DevOpsPlatform as native selects, RbacSystems as Checkbox grid
2. **Automation**: WorkflowTrigger (PullScheduledCron → CronPicker), AutomatedClassificationUpdate, AutomatedControlPlaneScopeUpdate (5 sub-fields), AutomatedEntraOpsUpdate (UpdateScheduledCron → CronPicker)
3. **Integrations**: LogAnalytics (5 string fields), SentinelWatchLists (2 array + 4 string fields)
4. **AD Management**: AutomatedAdministrativeUnitManagement, AutomatedConditionalAccessTargetGroups, AutomatedRmauAssignmentsForUnprotectedObjects
5. **Custom Security Attributes**: 4 string fields, no toggle

Sticky header shows "Edit Settings" in view mode, "Cancel" + "Preview Changes" in edit mode, "Unsaved changes" badge when isDirty. `configDraftSchema.safeParse(draft)` gates DiffDialog opening — errors displayed as a list above the form. DiffDialog receives `JSON.stringify(diskConfig, null, 2)` as before, `JSON.stringify(draft, null, 2)` as after.

### Task 2: ConfigEmptyState + full test run

**ConfigEmptyState.tsx** — Props: `onCheckAgain`. State: `tenantName`, `showAdvanced`, `authType`, `rbacSystems`, `ingestToLogAnalytics`, `ingestToWatchLists`, `copied`. `generatedCommand` derived via `useMemo`. Copy button uses `navigator.clipboard.writeText` with 2s `copied` state feedback. "Show advanced options" disclosure shows AuthenticationType select, RbacSystems checkboxes, two boolean checkboxes. "Check Again" button calls `onCheckAgain`.

## Deviations

1. `Switch` component does not exist in the UI library → used `Checkbox` from `@/components/ui/checkbox` for all boolean toggles
2. `Select` component does not exist → used native `<select>` with Tailwind styling
3. `Tooltip` component does not exist → used `<span title="...">` wrapper for Lock icon
4. `lucide-react` does not accept `title` prop on SVG icons → moved to `<span title="...">` wrapper

## Self-Check: PASSED

- All 8 cron tests: ✓
- All 51 server tests: ✓
- TypeScript build: ✓
- Acceptance criteria: all verified
