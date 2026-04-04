---
plan: 11-01
phase: 11-implementation-workflow
status: complete
commit: 5d8db4d
completed: 2026-04-04
---

# Summary: 11-01 — Apply to Entra Page

## What Was Built

Created `ApplyPage.tsx` — a single-page 4-state machine implementing the full "Apply to Entra" workflow. Registered the `/apply` route in `App.tsx` and added a "Apply to Entra" sidebar navigation entry with `PlayCircle` icon between Exclusions and Templates.

## State Machine

| State | Screen | Trigger |
|-------|--------|---------|
| `idle` | Action selection with 4 checkbox cards | Page load / Apply Again |
| `confirming` | Pre-run confirmation table with amber live-tenant Alert | "Review & Apply" |
| `running` | Live SSE terminal with progress label | "Run Now" |
| `done` | Outcome summary per cmdlet + collapsed terminal | All cmdlets exit / stop |

## Key Decisions

- **Sequential execution**: `handleRun` loops through selected actions in order, awaiting each `runSingleCmdlet` call before advancing — matches the pre-run confirmation table ordering.
- **Stop behavior**: `stoppedRef.current = true` + abort current fetch; remaining cmdlets are marked `skipped` in the results map.
- **Outcome derivation**: `deriveOverallStatus` maps result combinations (all pass → completed, any fail → failed, any skipped without fails → stopped).
- **No SampleMode**: Per D-08 — explicitly excluded from this phase.

## Self-Check: PASSED

- [x] `ApplyPage.tsx` exports `function ApplyPage()`
- [x] `IMPLEMENTATION_ACTIONS` const with exactly 4 entries
- [x] All 4 cmdlet names present: `Update-EntraOpsPrivilegedAdministrativeUnit`, `Update-EntraOpsPrivilegedConditionalAccessGroup`, `Update-EntraOpsPrivilegedUnprotectedAdministrativeUnit`, `Update-EntraOpsClassificationControlPlaneScope`
- [x] `pageState` typed as `'idle' | 'confirming' | 'running' | 'done'`
- [x] `import.*TerminalOutput.*AnsiConvert` — TerminalOutput and AnsiConvert imported from TerminalOutput component
- [x] `fetch.*api/commands/run` — SSE execution via POST fetch
- [x] `api/config` fetch on mount for tenant pre-population
- [x] No `SampleMode` anywhere in file
- [x] "Review &amp; Apply" button text present
- [x] "Run Now" button text present
- [x] "Implementation Complete" heading text present
- [x] "Apply Again" button text present
- [x] `App.tsx` contains `path="apply"` and `element={<ApplyPage />}`
- [x] `Sidebar.tsx` `NAV_ITEMS` contains `{ to: '/apply', icon: PlayCircle, label: 'Apply to Entra' }` after `/exclusions` and before `/templates`
- [x] TypeScript: `npx tsc --noEmit` — no errors

## key-files

### created
- gui/client/src/pages/ApplyPage.tsx (ApplyPage component, 340 lines)

### modified
- gui/client/src/App.tsx (added import + route)
- gui/client/src/components/layout/Sidebar.tsx (added PlayCircle import + nav item)
