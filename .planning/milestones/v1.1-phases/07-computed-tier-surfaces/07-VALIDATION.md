---
phase: 07
slug: computed-tier-surfaces
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — no test infrastructure detected in `gui/` |
| **Config file** | none — Wave 0 not applicable (no test framework) |
| **Quick run command** | `cd gui && npx tsc --noEmit` |
| **Full suite command** | `cd gui && npx tsc --noEmit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd gui && npx tsc --noEmit`
- **After every plan wave:** Run `cd gui && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** TypeScript compilation must be green + manual browser verification
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | DASH-02 | type-check | `cd gui && npx tsc --noEmit` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | DASH-01, DASH-03 | type-check | `cd gui && npx tsc --noEmit` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | OBJ-01, OBJ-02, OBJ-03 | type-check | `cd gui && npx tsc --noEmit` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 2 | DASH-01, OBJ-01 | manual | Browser verification | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework — TypeScript compiler is the automated verification layer. Manual browser verification covers visual/behavioral requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| KPI cards show "Suggested: N" between big count and PIM stats | DASH-01, DASH-03 | Visual layout verification | Open dashboard; confirm "Suggested:" line visible on ControlPlane, ManagementPlane, UserAccess cards |
| Dashed badge shows computed tier for Unclassified objects | OBJ-01, OBJ-02 | Visual styling verification | Open Object Browser; find an Unclassified object with Classification entries; confirm dashed border + tier color |
| Applied-tier objects unchanged | OBJ-03 | Visual regression check | Open Object Browser; confirm ControlPlane/ManagementPlane/UserAccess objects show solid badges as before |
| Suggested counts reflect lowest AdminTierLevel | DASH-02 | Data correctness | Cross-reference a known object's Classification[] with dashboard Suggested count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
