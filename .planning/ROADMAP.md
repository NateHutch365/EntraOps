# Roadmap: EntraOps GUI

## Overview

EntraOps GUI starts as a local-only React dashboard that lets security administrators explore classified EAM data from `PrivilegedEAM/` JSON files without touching Azure Portal or writing KQL. The MVP (Phases 1–2) delivers a fully working read-only dashboard, paginated object browser, and a safe classification template editor — enough to validate the core value proposition. Post-MVP phases (3–5) layer in PowerShell command execution, git change history browsing, and a settings editor on top of the proven foundation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

---

- [x] **Phase 1: Foundation, Dashboard & Object Browser** — Working read-only app: scaffold, security baseline, data pipeline, tier dashboard, and paginated/filterable object browser from real `PrivilegedEAM/` data ⟵ **MVP**
- [ ] **Phase 2: Classification Template Editor** — In-browser editing of tier definition JSON files with schema validation, diff preview, and git commit warning ⟵ **MVP**

---
> **MVP BOUNDARY** — Phases 1–2 complete the minimum viable product. Phases 3–5 are post-MVP enhancements.
---

- [ ] **Phase 3: PowerShell Command Runner** — Trigger EntraOps cmdlets from the browser with real-time streamed output *(post-MVP)*
- [ ] **Phase 4: Git Change History** — Browse EAM diffs, compare classification runs, and see structured object-level change summaries *(post-MVP)*
- [ ] **Phase 5: Settings & Polish** — Structured `EntraOpsConfig.json` editor and cross-cutting UX polish *(post-MVP)*

## Phase Details

### Phase 1: Foundation, Dashboard & Object Browser
**Goal**: A security admin can run `npm run dev` and immediately explore their classified EAM data in a browser — sorting, filtering, and deep-linking into privileged object details — from real `PrivilegedEAM/` files
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, OBJ-01, OBJ-02, OBJ-03, OBJ-04, OBJ-05, OBJ-06, OBJ-07
**Success Criteria** (what must be TRUE):
  1. Running `npm run dev` opens a working dashboard at `localhost` showing ControlPlane / ManagementPlane / UserAccess KPI counts drawn from real `PrivilegedEAM/` JSON files — no manual setup beyond `npm install`
  2. Dashboard shows RBAC system breakdown, object type breakdown, PIM assignment type chart, data freshness timestamp, and a recent git commits widget — all derived from the same local file data
  3. Object browser displays all privileged objects in a sortable, paginated table; user can multi-select filters (tier, RBAC system, object type, PIM type), search by name/UPN, and the resulting URL is bookmarkable and shareable
  4. Clicking any object opens a slide-out detail panel with identity card, all role assignments with expandable `RoleDefinitionActions`, AU memberships, and RMAU status; each object also has a stable full-page URL
  5. When `PrivilegedEAM/` is empty, the app shows a helpful setup guide instead of crashing; the app runs identically on Windows, macOS, and Linux
**Plans**: TBD

### Phase 2: Classification Template Editor
**Goal**: Security admins and EntraOps contributors can safely edit EAM tier classification templates in-browser, with schema validation and diff preview, eliminating the need to hand-edit JSON files
**Depends on**: Phase 1
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07
**Success Criteria** (what must be TRUE):
  1. User can open the template editor and see all five classification files as a structured tree (tier → category → service hierarchy) — not raw JSON
  2. User can edit `RoleDefinitionActions` for any definition entry inline; saving is blocked with a clear validation error if the edit fails Zod schema validation
  3. Before any file write, the user sees a diff of what will change; after saving, the UI warns that changes should be committed to git
  4. `Classification/Global.json` exclusion list is viewable and editable in the same tabbed interface alongside the five template files
**Plans**: TBD

---
> **POST-MVP** — The phases below are defined for completeness and future planning. They are not in the current milestone scope.
---

### Phase 3: PowerShell Command Runner *(post-MVP)*
**Goal**: Users can trigger EntraOps classification commands from the browser with real-time streamed output, eliminating the need to switch to a terminal for routine operations
**Depends on**: Phase 2
**Requirements**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06 *(v2 — deferred)*
**Success Criteria** (what must be TRUE):
  1. User can select an EntraOps cmdlet from the command palette and execute it from the browser — only explicitly allowlisted cmdlets are available; there is no way to run arbitrary code
  2. Command output streams in real time to a terminal-style display with ANSI colour preserved; a Stop button kills the running process at any time
  3. Only one command can run at a time; a second run attempt is blocked with a clear error and option to stop the current command; session command history is visible below the terminal
**Plans**: TBD

### Phase 4: Git Change History *(post-MVP)*
**Goal**: Users can browse the EAM change history from the browser, understand what changed between classification runs, and compare any two snapshots — without opening a terminal or git CLI
**Depends on**: Phase 2
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05 *(v2 — deferred)*
**Success Criteria** (what must be TRUE):
  1. User can see a chronological list of git commits that touched `PrivilegedEAM/` with date, message, and affected files — without opening a terminal
  2. Selecting a commit shows a structured change summary: objects added, objects removed, and objects whose tier changed — not just a raw diff
  3. User can compare any two commits (not just adjacent ones) and view a JSON diff for a chosen RBAC system's aggregate file
**Plans**: TBD

### Phase 5: Settings & Polish *(post-MVP)*
**Goal**: Users can view and edit `EntraOpsConfig.json` from the browser in a structured form, and the app delivers a polished, consistent experience across all features
**Depends on**: Phase 4
**Requirements**: SETT-01, SETT-02, SETT-03 *(v2 — deferred)*
**Success Criteria** (what must be TRUE):
  1. User can view and edit `EntraOpsConfig.json` in a structured (non-raw JSON) form from the Settings page; changes are validated and saved safely
  2. When no config file exists, the Settings page shows a clear empty state with instructions for `New-EntraOpsConfigFile` — no crash, no blank page
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Dashboard & Object Browser | 0/? | Not started | - |
| 2. Classification Template Editor | 0/? | Not started | - |
| 3. PowerShell Command Runner *(post-MVP)* | 0/? | Not started | - |
| 4. Git Change History *(post-MVP)* | 0/? | Not started | - |
| 5. Settings & Polish *(post-MVP)* | 0/? | Not started | - |
