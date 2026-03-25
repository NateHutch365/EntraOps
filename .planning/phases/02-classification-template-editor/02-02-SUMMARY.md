---
phase: 02-classification-template-editor
plan: 02
subsystem: ui
tags: [react, shadcn, tailwind, diff, tabs, accordion, react-router]

requires:
  - phase: 02-classification-template-editor
    provides: TemplateName/TierBlock types, GetTemplateResponse interface, /api/templates/:name endpoint

provides:
  - /templates page with 6-tab navigation (5 template names + Global Exclusions)
  - Templates sidebar nav entry (FileJson icon, active-state highlight)
  - TierAccordion component — renders tiers with entry cards (read-only scope badge + action pills)
  - DiffDialog component — shared diff preview with green/red line rendering (used by 02-03 and 02-04)
  - shadcn accordion, tabs, alert components installed

affects: [02-03-chip-editor, 02-04-global-exclusions]

tech-stack:
  added: [diff@8.0.4, @types/diff (dev), @testing-library/jest-dom (dev)]
  patterns:
    - Relative path imports for shared types: ../../../../shared/types/templates
    - Tab-gated fetch with cache: only fetches if templateData[name] is empty, skips 'global' tab
    - Tier semantic class map: Record<EAMTierLevelName, string> → TIER_CLASS constant

key-files:
  created:
    - gui/client/src/pages/TemplatesPage.tsx
    - gui/client/src/components/templates/TierAccordion.tsx
    - gui/client/src/components/templates/DiffDialog.tsx
    - gui/client/src/components/ui/accordion.tsx
    - gui/client/src/components/ui/tabs.tsx
    - gui/client/src/components/ui/alert.tsx
    - gui/client/src/vite-env.d.ts
  modified:
    - gui/client/src/components/layout/Sidebar.tsx
    - gui/client/src/App.tsx
    - gui/client/package.json

key-decisions:
  - "DiffDialog uses diffLines() from diff package — renders each Change object's value as a <span> block with bg-green-950/bg-red-950 Tailwind classes for dark diff colors"
  - "TemplatesPage activeTab state is TemplateName | 'global' — fetch effect has early return for 'global' to avoid sending it to /api/templates/:name"
  - "shadcn components installed via npx shadcn@latest add — accordion, tabs, alert added; input already existed"
  - "vite-env.d.ts created (was missing from Phase 1 scaffold) and @testing-library/jest-dom installed to fix pre-existing TS2882 build errors"

patterns-established:
  - "Template tab fetch: cache in state, skip if already loaded, skip 'global' — prevents redundant API calls on tab re-activation"
  - "Tier color map pattern: Record<EAMTierLevelName, className> lookup for semantic color classes"

requirements-completed:
  - TMPL-01
  - TMPL-02

deviations:
  - "Fixed pre-existing Phase 1 build failures: created missing vite-env.d.ts (/// <reference types='vite/client' />) and installed @testing-library/jest-dom. Both caused TS2882 errors blocking tsc -b. Not in plan scope but required for success criteria."

duration: 25min
completed: 2026-03-25
---

# Phase 02-02: Templates UI Shell

**6-tab TemplatesPage with read-only tier accordion, shared DiffDialog component with green/red diff rendering, and Templates sidebar nav entry — all backed by the 02-01 API.**

## What Was Built

- `TemplatesPage` — tabbed interface with 5 classification template tabs + Global Exclusions placeholder. Fetches `/api/templates/:name` on tab activation, caches responses, shows skeletons while loading.
- `TierAccordion` — accordion per tier (ControlPlane/ManagementPlane/UserAccess) with semantic color classes. Each entry shows Category/Service, read-only scope badge, and action pills.
- `DiffDialog` — shared dialog using `diffLines()` from the `diff` package. Renders added lines in dark green (`bg-green-950 text-green-300`) and removed lines in dark red (`bg-red-950 text-red-300`). Used by 02-03 and 02-04.
- Sidebar nav extended with FileJson → /templates route, highlights on active.
- React Router entry in App.tsx routes `templates` to `TemplatesPage`.

## Key Links Verified

- `App.tsx` → `TemplatesPage` via `<Route path="templates" />`
- `Sidebar.tsx` → `/templates` via `NAV_ITEMS` with `FileJson` icon  
- `TemplatesPage` → `/api/templates/:name` via `fetch` in `useEffect`
- `TierAccordion` / `DiffDialog` export from `src/components/templates/`

## Deviations

- **Pre-existing build fixes:** Created missing `vite-env.d.ts` and installed `@testing-library/jest-dom` to fix two TS2882 errors that predated plan 02-02 (from Phase 1 scaffold). Both were blocking `tsc -b` and therefore blocking the plan's success criteria. Changes committed in Task 1 commit (`ffcf85c`).

## Self-Check: PASSED

- `gui/client/src/pages/TemplatesPage.tsx` ✓ exists on disk
- `gui/client/src/components/templates/DiffDialog.tsx` ✓ exists on disk  
- `git log --oneline --grep="02-02"` returns 2 commits (`ffcf85c`, `07ae9b1`)
- TypeScript build passes: `tsc -b && vite build` — ✓ built in 1.68s, no errors
