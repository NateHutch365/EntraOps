---
phase: 06
slug: settings-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `gui/client/vite.config.ts` (inline `test:` block) |
| **Quick run command** | `cd gui/server && npm test` |
| **Full suite command** | `cd gui/server && npm test && cd ../client && npm test -- --run` |
| **TypeScript build check** | `cd gui/client && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd gui/server && npm test`
- **After every plan wave:** Run `cd gui/server && npm test && cd ../client && npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green + TypeScript build green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SETT-01/02 | unit | `cd gui/server && npm test` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | SETT-02 | integration | `cd gui/server && npm test` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | Polish | unit | `cd gui/client && npm test -- --run` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | Polish | manual | Browser nav audit | N/A | ⬜ pending |
| 06-03-01 | 03 | 2 | SETT-01 | unit (RTL) | `cd gui/client && npm test -- --run src/pages/SettingsPage.test.tsx` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | SETT-03 | unit (RTL) | `cd gui/client && npm test -- --run src/pages/SettingsPage.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `gui/server/src/__tests__/config.test.ts` — covers PUT /api/config validation and atomic write (follow `templates.test.ts` pattern: `vi.mock('node:fs/promises')`, `supertest`, `buildApp()` helper)
- [ ] `gui/client/src/lib/cron.test.ts` — unit tests for `describeCron()` pure function

*Existing test infrastructure covers server test scaffold — only these new files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings page renders 4 section cards with correct layout | SETT-01 | Visual layout | Open /settings, verify 4 section headers visible |
| Cron picker dropdowns display correct options | SETT-01 | Interactive UI | Click each cron dropdown, verify options |
| Empty state mini-form generates correct PowerShell command | SETT-03 | Interactive UI | Type tenant name, verify command updates live |
| Terminal output line spacing is correct | Polish | Visual | Run a command, verify no double-spacing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
