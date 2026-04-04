# Phase 11: Implementation Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 11-implementation-workflow
**Areas discussed:** Page structure, CTAs on Object Browser & Reclassify, Multi-cmdlet progress layout, Outcome summary

---

## Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single page, 3-phase state machine | One /implement page. Phases: (1) Setup—checkboxes to select cmdlets + 'Review' button; (2) Confirmation—summary of what will run + 'Apply' button; (3) Running—live SSE log transitioning to outcome summary. | |
| Two pages: confirmation then run | /implement for setup + confirmation, then /implement/run for streaming + outcome. Cleaner separation but requires routing and back-nav handling. | |
| H1 page + content adapts per phase | Page header with H1 'Apply to Entra', content area adapts per phase. No stepper chrome. | |
| Explicit stepper/wizard component | Multi-step stepper (Step 1/2/3), content below changes per step. More explicit but more visual chrome. | |

**User's choice:** "You pick, prioritise user simplicity" (multiple questions)
**Notes:** User consistently delegated all page structure decisions to Claude. Claude resolved to: single-page 3-phase state machine with H1 + adapting content area (no stepper). Prioritises simplicity and reuse over novelty.

---

## CTAs on Object Browser & Reclassify (IMPL-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Header-level button | Persistent 'Apply to Entra' button in the page header next to H1 on both screens. Always visible. | |
| Sticky bottom banner | Sticky banner at bottom: "Ready to apply? → Apply to Entra" | |
| Claude's discretion | Pick based on what's simplest given existing layout patterns | ✓ |

**User's choice:** Claude's discretion
**Notes:** User delegated CTA placement to Claude. Claude will follow existing header/layout patterns from ExclusionsPage and ReclassifyPage.

---

## Multi-cmdlet Progress Layout (IMPL-06)

| Option | Description | Selected |
|--------|-------------|----------|
| One combined terminal stream with separators | All 4 cmdlets output into one shared terminal stream with a visible separator between them (like RunCommandsPage's ─── separator). | |
| Accordion per cmdlet | Each cmdlet gets its own collapsible accordion section with spinner → output → pass/fail badge. | |
| Claude's discretion | Prioritise simplicity and reuse of existing patterns | ✓ |

**User's choice:** Claude's discretion
**Notes:** User delegated progress layout to Claude. Claude will use one combined terminal stream with separators — consistent with existing RunCommandsPage pattern and reuses TerminalOutput component directly.

---

## Outcome Summary (IMPL-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Summary card below the terminal log | After all cmdlets complete, a summary card appears below showing icon (check/x) + cmdlet display name + exit status per row. | |
| Inline status in the terminal log itself | Each cmdlet's separator line in the log gets updated with a check/x badge inline once its run finishes. | |
| Claude's discretion | Prioritise clarity for the admin and simplicity of implementation | ✓ |

**User's choice:** Claude's discretion
**Notes:** User delegated outcome summary to Claude. Claude recommends summary card below the log for clear admin-facing result communication.

---

## Claude's Discretion

All four major gray areas were delegated to Claude's discretion. Key constraints the user did assert:
1. Prioritise user simplicity over novelty
2. Reuse existing patterns where available

## Deferred Ideas

- IMPL-05 / `-SampleMode` dry-run toggle — Phase 12 (per REQUIREMENTS.md)
- Pre-install prerequisite PS modules — deferred post-v1.2
- Terminal line-spacing fix — deferred post-v1.2
