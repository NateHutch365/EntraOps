---
created: 2026-03-25T17:12:55.513Z
title: Fix DiffDialog overflow in large template previews
area: ui
files:
  - gui/client/src/components/templates/DiffDialog.tsx
  - gui/client/src/components/templates/TierAccordion.tsx
---

## Problem

The DiffDialog preview modal overflows the browser window when previewing changes to large classification templates (e.g. Classification_AadResources.json which has many RoleDefinitionActions). The dialog content spills beyond the viewport edges, making it hard to read the full diff. This issue does not occur in the Global Exclusions tab preview, which has less content and fits cleanly within the dialog bounds.

Observed during Phase 2 UAT (Step 4 — TMPL-04). Non-blocking but degrades UX for power users editing large templates.

## Solution

Constrain the DiffDialog content area with:
- `max-height` on the diff content container with `overflow-y: auto` scroll
- `overflow-x: hidden` or horizontal scroll if needed
- Possibly set `max-width` and center the dialog with proper viewport constraints

Reference: Global Exclusions DiffDialog works correctly — compare its implementation against the TierAccordion version to find the discrepancy.
