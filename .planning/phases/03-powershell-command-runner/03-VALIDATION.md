---
phase: 03
slug: powershell-command-runner
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (server: `gui/server/vitest.config.ts`, client: vitest via Vite) |
| **Config file** | `gui/server/vitest.config.ts`, `gui/client/vite.config.ts` |
| **Quick run command** | `npm run test -w server` |
| **Full suite command** | `npm test` (from `gui/`) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -w server`
- **After every plan wave:** Run `npm test` (from `gui/`)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | RUN-04 | unit | `npm run test -w server -- --filter=commands.allowlist` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | RUN-06 | unit | `npm run test -w server -- --filter=commands.history` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | RUN-03, RUN-05 | integration | `npm run test -w server -- --filter=commands.stream` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | RUN-05 | unit | `npm run test -w server -- --filter=commands.stop` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | RUN-01, RUN-02 | e2e-manual | See Manual-Only | n/a | ⬜ pending |
| 03-03-02 | 03 | 2 | RUN-03 | e2e-manual | See Manual-Only | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `gui/server/routes/commands.test.ts` — stubs for allowlist, history, stream, stop tests

*Existing test infrastructure (vitest) covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Command palette renders cmdlets, user can select and see parameter form | RUN-01, RUN-02 | Interactive UI component — no headless browser in test suite | Visit `/run`, verify cmdk palette opens, select a cmdlet, verify form fields appear |
| ANSI-colored output streams in real time during live PowerShell run | RUN-03 | Requires live `pwsh` process and browser render | Run `Save-EntraOpsPrivilegedEAMJson` from UI, verify colored output appears incrementally |
| Stop button kills process and injects `[Stopped by user]` message | RUN-05 | Process lifecycle + live browser interaction | Start a long-running cmdlet, click Stop within 2s, verify process dies and message appears |
| History entry persists after page reload | RUN-06 | Requires browser state persistence check | Run any cmdlet to completion, reload page, verify history entry still visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
