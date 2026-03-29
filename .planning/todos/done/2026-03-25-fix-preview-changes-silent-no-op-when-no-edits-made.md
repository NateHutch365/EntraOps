---
created: 2026-03-25T17:12:55.513Z
title: Fix Preview Changes silent no-op when no edits made
area: ui
files:
  - gui/client/src/components/templates/TierAccordion.tsx
---

## Problem

Clicking "Preview Changes" on a template entry card before making any edits does nothing — no dialog opens, no toast appears, no disabled state shown. The button silently no-ops because `handlePreview` only opens the DiffDialog when `dirtyActions[key]` exists. Users have no idea why the button doesn't respond.

Found during Phase 2 verification audit (truth #16 in 02-VERIFICATION.md).

## Solution

Two options:
1. **Disable the button** when there are no dirty actions for that entry (`disabled={!dirtyActions[key]}`) — simple and clear
2. **Show a toast** "No changes to preview yet" if clicked with no edits — more discoverable but adds a dependency

Option 1 is simpler. Apply `disabled` prop to the Preview Changes Button in `TierAccordion.tsx`.
