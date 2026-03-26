---
phase: 5
slug: git-change-history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (server-side unit tests) |
| **Config file** | `gui/server/vitest.config.ts` (or create if absent) |
| **Quick run command** | `cd gui && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd gui && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | HIST-01 | unit | `cd gui && npx vitest run server/services/gitHistory.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | HIST-02, HIST-03 | unit | `cd gui && npx vitest run server/services/changeSummary.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | HIST-01 | integration | `cd gui && npx vitest run server/routes/git.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | HIST-01, HIST-02 | manual | Browser: expand commit row, verify structured changes | N/A | ⬜ pending |
| 05-04-01 | 04 | 2 | HIST-04 | manual | Browser: select 2 commits, compare, verify diff | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `gui/server/services/gitHistory.test.ts` — stubs for commit listing, pagination
- [ ] `gui/server/services/changeSummary.test.ts` — stubs for structured diff algorithm

---

*Validation strategy created: 2026-03-26*
