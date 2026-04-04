# Roadmap: EntraOps GUI

## Milestones

- [x] **v1.0 MVP** ✅ SHIPPED 2026-03-26 — Full GUI: dashboard, object browser, template editor, PowerShell runner, Connect wizard, git history, settings (6 phases, 30 plans, 338 files) — [archive](.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1 Pre-Apply Intelligence** ✅ SHIPPED 2026-03-29 — Computed tier surfaces in Dashboard & Object Browser; Object-Level Reclassification screen (2 phases, 6 plans) — [archive](.planning/milestones/v1.1-ROADMAP.md)
- [ ] **v1.2 Self-Service Implementation Workflow** — GUI Exclusions Management + guided Apply to Entra workflow with real-time SSE streaming (4 phases)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-03-26</summary>

See [archive](.planning/milestones/v1.0-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.1 Pre-Apply Intelligence (Phases 7–8) — SHIPPED 2026-03-29</summary>

- [x] Phase 7: Computed Tier Surfaces (2/2 plans) — completed 2026-03-26
- [x] Phase 8: Object Reclassification Screen (4/4 plans) — completed 2026-03-28

See [archive](.planning/milestones/v1.1-ROADMAP.md) for full phase details.

</details>

### v1.2 Self-Service Implementation Workflow (Phases 9–12)

- [ ] **Phase 9: Exclusions Management** — Backend API + dedicated Exclusions page with name resolution and remove action
- [x] **Phase 10: Inline Exclude Actions** — One-click exclude row action on Object Browser and Reclassify screens (completed 2026-04-02)
- [x] **Phase 11: Implementation Workflow** — "Apply to Entra" page with action selection, pre-run confirmation, SSE streaming, and outcome summary (completed 2026-04-04)
- [ ] **Phase 12: Dry-run / Preview Mode** — -SampleMode flag plumbing exposed as toggle on the implementation screen

## Phase Details

### Phase 9: Exclusions Management
**Goal**: Admins can manage Global.json exclusions entirely from the browser without touching JSON files
**Depends on**: Phase 8 (Object Reclassification Screen — existing sidebar + nav patterns)
**Requirements**: EXCL-01, EXCL-02, EXCL-03
**Success Criteria** (what must be TRUE):
  1. User can reach the Exclusions page from the sidebar nav
  2. Exclusions page lists every excluded object with its resolved display name (not raw GUID)
  3. User can remove any exclusion and it is immediately deleted from Global.json
**Plans**: 3 plans
Plans:
- [x] 09-01-PLAN.md — Backend API: GET /api/exclusions (PrivilegedEAM name resolution) + DELETE /api/exclusions/:guid
- [x] 09-02-PLAN.md — ExclusionsPage client + App.tsx route + Sidebar.tsx nav entry
- [x] 09-03-PLAN.md — Simplify GlobalExclusionsTab to read-only with link to Exclusions page
**UI hint**: yes

### Phase 10: Inline Exclude Actions
**Goal**: Admins can exclude any object directly from the screen they are already on without navigating away
**Depends on**: Phase 9 (Exclusions backend API must exist)
**Requirements**: EXCL-04, EXCL-05
**Success Criteria** (what must be TRUE):
  1. Object Browser rows expose a one-click "Exclude" action that persists the addition to Global.json
  2. Reclassify screen rows expose a one-click "Exclude" action that persists the addition to Global.json
  3. After excluding from either screen, the Exclusions page shows the newly added entry with its display name
**Plans**: 3 plans
Plans:
- [x] 10-01-PLAN.md — POST /api/exclusions endpoint + useExclusions hook update (URL + addExclusion)
- [x] 10-02-PLAN.md — ObjectTable Actions column + ObjectBrowser wiring (EXCL-04)
- [x] 10-03-PLAN.md — ReclassifyPage Actions column + handleExclude with pending-map cleanup (EXCL-05)
**UI hint**: yes

### Phase 11: Implementation Workflow
**Goal**: Admins can apply the full EntraOps tier structure to their Entra tenant from the browser with full visibility of what will run
**Depends on**: Phase 10 (Exclusions complete; all pre-apply review screens done)
**Requirements**: IMPL-01, IMPL-02, IMPL-03, IMPL-04, IMPL-06, IMPL-07
**Success Criteria** (what must be TRUE):
  1. User can navigate to "Apply to Entra" from the sidebar and via CTAs on Object Browser and Reclassify screens
  2. A pre-run confirmation screen shows exactly which cmdlets will execute and their parameters before anything runs
  3. User can toggle any combination of the 4 implementation actions (Administrative Units, CA Groups, Unprotected AUs, ControlPlane Scope) on or off before running
  4. A live SSE log streams each cmdlet's output in real time while implementation runs
  5. An outcome summary clearly shows pass/fail status for each cmdlet after the run completes
**Plans**: 2 plans
Plans:
- [x] 11-01-PLAN.md — ApplyPage with 4-state workflow (action selection, confirmation, SSE execution, outcome) + routing + nav
- [x] 11-02-PLAN.md — Cross-page CTAs on ObjectBrowser and ReclassifyPage + human-verify
**UI hint**: yes

### Phase 12: Dry-run / Preview Mode
**Goal**: Admins can safely simulate an implementation run to verify what would change before committing to Entra
**Depends on**: Phase 11 (Implementation Workflow must exist to extend)
**Requirements**: IMPL-05
**Success Criteria** (what must be TRUE):
  1. User can enable dry-run mode via a toggle on the implementation screen before initiating a run
  2. In dry-run mode, cmdlets execute with -SampleMode and no changes are written to Entra
  3. The progress log clearly labels dry-run output as simulated so the admin cannot mistake it for a real run
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–6 (v1.0 phases) | v1.0 | 30/30 | Complete | 2026-03-26 |
| 7. Computed Tier Surfaces | v1.1 | 2/2 | Complete | 2026-03-26 |
| 8. Object Reclassification Screen | v1.1 | 4/4 | Complete | 2026-03-28 |
| 9. Exclusions Management | v1.2 | 0/? | Not started | - |
| 10. Inline Exclude Actions | v1.2 | 3/3 | Complete    | 2026-04-02 |
| 11. Implementation Workflow | v1.2 | 2/2 | Complete    | 2026-04-04 |
| 12. Dry-run / Preview Mode | v1.2 | 0/? | Not started | - |
