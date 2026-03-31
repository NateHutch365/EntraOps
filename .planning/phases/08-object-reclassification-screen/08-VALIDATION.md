---
phase: 08
slug: object-reclassification-screen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1 + supertest 7.2 |
| **Config file** | `gui/server/vitest.config.ts` |
| **Quick run command** | `cd gui/server && npx vitest run routes/overrides.test.ts` |
| **Full suite command** | `cd gui/server && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd gui/server && npx vitest run routes/overrides.test.ts`
- **After every plan wave:** Run `cd gui/server && npx vitest run`
- **Before `/gsd-verify-work`:** Full server suite green + manual browser verification
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | RECL-02 | type-check | `cd gui && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | RECL-04 | type-check | `cd gui && npx tsc --noEmit` | ✅ (shared/types/api.ts) | ⬜ pending |
| 08-01-03 | 01 | 1 | RECL-04 | unit | `cd gui/server && npx vitest run routes/overrides.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | RECL-04 | unit | `cd gui/server && npx vitest run routes/overrides.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | RECL-04 | type-check | `cd gui && npx tsc --noEmit` | ✅ | ⬜ pending |
| 08-03-01 | 03 | 3 | RECL-02, RECL-03, RECL-05 | type-check | `cd gui && npx tsc --noEmit` | ✅ | ⬜ pending |
| 08-03-02 | 03 | 3 | RECL-02, RECL-03, RECL-05 | type-check | `cd gui && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 4 | RECL-01 | type-check | `cd gui && npx tsc --noEmit` | ✅ | ⬜ pending |
| 08-04-02 | 04 | 4 | RECL-01, RECL-02, RECL-03, RECL-04, RECL-05 | manual | Browser: visit `/reclassify`, exercise all interactions | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `gui/client/src/components/ui/select.tsx` — shadcn Select component (required by RECL-02 inline control in ReclassifyPage)
- [ ] `gui/server/routes/overrides.test.ts` — failing tests for GET and POST `/api/overrides` (covers RECL-04 before route implementation)

*Existing `gui/shared/types/api.ts` and server test config cover remaining tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/reclassify` nav link visible in sidebar between Browse Objects and Templates | RECL-01 | Visual layout | Open app; confirm Reclassify nav item with SlidersHorizontal icon appears in correct position |
| All objects listed with Applied Tier and Computed Tier columns | RECL-01 | Visual/data rendering | Navigate to `/reclassify`; confirm table shows all objects with both tier columns populated |
| Inline Select per row pre-populated from persisted overrides | RECL-02 | Interactive browser state | Save a known override; refresh; confirm Select shows saved value |
| Row with pending (unsaved) change gets amber background | RECL-03 | Visual style | Change a Select value without saving; confirm `bg-amber-500/10` class applied |
| "Save All (N)" count updates as rows are edited | RECL-03 | Interactive counter | Change 2 rows; confirm button shows "Save All (2)" |
| Overrides persist across page refresh after Save | RECL-04 | End-to-end | Save overrides; refresh; confirm selections still shown |
| Discard clears all pending changes without server call | RECL-05 | Interactive | Edit rows; click Discard; confirm amber highlights removed, no network request |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
