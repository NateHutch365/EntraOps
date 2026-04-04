---
phase: 12-dry-run-preview-mode
status: passed
verified_at: 2026-04-04
verified_by: human-browser
---

## Human UAT: Phase 12 — Dry-run / Preview Mode

Verified via integrated browser at http://localhost:5173/apply on 4 Apr 2026.

### Screen 1 — Idle

| Check | Result |
|-------|--------|
| Dry-run toggle visible below action cards | ✓ |
| Toggle OFF → CTA reads "Review & Apply" | ✓ |
| Toggle ON → `◈ Simulation active` badge appears | ✓ |
| Toggle ON → CTA changes to "Review & Simulate" | ✓ |

### Screen 2 — Confirm

| Check | Result |
|-------|--------|
| Sky blue `Simulation Mode` alert with FlaskConical icon | ✓ |
| All 4 Parameters cells show `-SampleMode` | ✓ |
| CTA reads "Simulate Now" | ✓ |
| Subtitle reads "No changes will be applied to your Entra tenant" | ✓ |

### Screen 3 — Running

| Check | Result |
|-------|--------|
| Heading reads "Simulating — Dry-run in progress…" | ✓ |
| `◈ Simulating` badge | ✓ |
| Sky reminder banner visible | ✓ |
| Terminal separator prefix reads `[DRY RUN]` | ✓ |

### Screen 4 — Done

| Check | Result |
|-------|--------|
| Heading reads "Dry-run — Simulation Errors" (fail case) | ✓ |
| `◈ Simulated` badge | ✓ |
| Sky "Dry-run complete — no changes were made" banner | ✓ |
| Per-cmdlet `◈ Sim. Fail` badges | ✓ |
| Terminal separators labeled `[DRY RUN]` | ✓ |

### Persistence & History

| Check | Result |
|-------|--------|
| Apply Again → returns to Screen 1 with toggle still ON | ✓ |
| Apply Again → CTA still reads "Review & Simulate" | ✓ |
| History page shows no simulation run entry (dry-run excluded) | ✓ |

**Verdict: PASSED** — All Phase 12 UAT checks confirmed in browser.

> Cmdlet errors expected — server not connected to tenant. UI behaviour is correct.
