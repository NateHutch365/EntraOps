---
plan: 11-02
phase: 11-implementation-workflow
status: complete
commit: ce995f9
completed: 2026-04-04
---

# Summary: 11-02 — Apply to Entra CTA Buttons

## What Was Built

Added "Apply to Entra" call-to-action buttons to the Object Browser and Reclassify pages, completing IMPL-02 (reachability from existing screens). Both buttons use `variant="secondary"` with a `PlayCircle` icon and navigate to `/apply`.

## Changes

| File | Change |
|------|--------|
| `gui/client/src/pages/ObjectBrowser.tsx` | Header converted to `flex justify-between`; secondary CTA button added; `Button` + `PlayCircle` imports added |
| `gui/client/src/pages/ReclassifyPage.tsx` | Header content wrapped in `flex justify-between`; secondary CTA button added; `PlayCircle` added to existing lucide import |

## Self-Check: PASSED

- [x] `ObjectBrowser.tsx` contains `Apply to Entra` string
- [x] `ObjectBrowser.tsx` contains `navigate('/apply')`
- [x] `ObjectBrowser.tsx` contains `PlayCircle` import from lucide-react
- [x] `ReclassifyPage.tsx` contains `Apply to Entra` string
- [x] `ReclassifyPage.tsx` contains `navigate('/apply')`
- [x] `ReclassifyPage.tsx` contains `PlayCircle` import from lucide-react
- [x] Both files use `variant="secondary"` on the CTA button
- [x] TypeScript: `npx tsc --noEmit` — no errors

## key-files

### modified
- gui/client/src/pages/ObjectBrowser.tsx (added CTA button to header)
- gui/client/src/pages/ReclassifyPage.tsx (added CTA button to header)
