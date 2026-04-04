---
plan: 12-01
phase: 12-dry-run-preview-mode
status: complete
commit: dbf0c8c
---

## Summary

Installed the shadcn `Switch` component and implemented all dry-run/preview mode client-side changes in `ApplyPage.tsx`. Delivers the complete visual and functional dry-run experience across all four screen states.

## What Was Built

**Switch component** (`gui/client/src/components/ui/switch.tsx`): Installed via `npx shadcn@latest add switch`.

**ApplyPage.tsx dry-run changes:**
- `isDryRun` state (`useState(false)`) — threads through all four screens
- `handleApplyAgain` intentionally does NOT reset `isDryRun` (per D-03 — admin can simulate again without re-enabling)
- `handleRun` adds `parameters.SampleMode = true` when `isDryRun` is true; terminal separator shows `[DRY RUN]` prefix in sky-500
- **Screen 1**: Toggle with label + description between action cards and CTA; `◈ Simulation active` sky badge when on; CTA text `Review & Simulate` vs `Review & Apply`
- **Screen 2**: Conditional subtitle, sky Alert with `FlaskConical` icon + `Simulation Mode` title vs amber Alert, `-SampleMode` in parameters column, `Simulate Now` vs `Run Now`
- **Screen 3**: `Simulating — Dry-run in progress…` heading, `◈ Simulating` sky badge, persistent sky reminder banner above terminal
- **Screen 4**: Sky simulation banner after `OutcomeHeader`, `◈ Sim. Pass`/`◈ Sim. Fail` per-cmdlet badges; OutcomeHeader dry-run variants for all 4 outcome states
- New imports: `AlertTitle`, `FlaskConical`, `Switch`, `Label`

## Self-Check: PASSED

- [x] `isDryRun` state declared and threaded through all 4 screens
- [x] `switch.tsx` exists at `gui/client/src/components/ui/switch.tsx`
- [x] All 22 acceptance criteria strings present in ApplyPage.tsx
- [x] `handleApplyAgain` does NOT contain `setIsDryRun`
- [x] `npx tsc --noEmit` exits 0 — zero TypeScript errors

## Key Files

key-files:
  created:
    - gui/client/src/components/ui/switch.tsx
  modified:
    - gui/client/src/pages/ApplyPage.tsx
