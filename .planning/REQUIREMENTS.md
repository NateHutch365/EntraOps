# Requirements: EntraOps GUI

**Defined:** 2026-03-24
**Core Value:** A user who has run `Save-EntraOpsPrivilegedEAMJson` can open a browser and immediately understand who holds ControlPlane access in their tenant — without writing a KQL query, opening Azure Portal, or reading raw JSON.

## v1 Requirements

### Foundation & Scaffold

- [ ] **FOUND-01**: Project scaffold exists at `gui/` with `client/`, `server/`, `shared/` layout and all dependencies installable via `npm install`
- [ ] **FOUND-02**: Single command `npm run dev` starts both Vite dev server and Express backend concurrently
- [ ] **FOUND-03**: Design system is configured — Tailwind v4, shadcn/ui components, Microsoft Fluent colour tokens, Segoe UI Variable font
- [ ] **FOUND-04**: Express server binds to `127.0.0.1` only, with security baseline (helmet, path traversal guards on all file-serving routes)
- [ ] **FOUND-05**: React Router v7 app shell with persistent sidebar navigation linking to all top-level pages
- [ ] **FOUND-06**: Vite proxies API calls to Express backend in development; build output serves from Express in production
- [ ] **FOUND-07**: Shared TypeScript types in `gui/shared/types/` used by both client and server (no type drift)
- [ ] **FOUND-08**: Cross-platform compatibility verified on Windows, macOS, and Linux (path separators, PowerShell executable name)

### Dashboard

- [ ] **DASH-01**: Dashboard displays privileged object counts broken down by EAM tier (ControlPlane, ManagementPlane, UserAccess)
- [ ] **DASH-02**: Dashboard shows object type breakdown per tier (User, Group, Service Principal)
- [ ] **DASH-03**: Dashboard shows RBAC system breakdown per tier (EntraID, ResourceApps, IdentityGovernance, DeviceManagement, Defender)
- [ ] **DASH-04**: Dashboard shows PIM assignment type chart — Permanent vs Eligible counts per tier
- [ ] **DASH-05**: Dashboard shows a "recent changes" widget listing the last 5 git commits that touched `PrivilegedEAM/`
- [ ] **DASH-06**: Dashboard displays data freshness — timestamp of the most recently written `PrivilegedEAM/` file
- [ ] **DASH-07**: Dashboard shows an empty state with setup instructions when no `PrivilegedEAM/` data exists yet

### Object Browser

- [ ] **OBJ-01**: Object browser displays all privileged objects in a sortable, paginated table
- [ ] **OBJ-02**: User can filter objects by tier (multi-select), RBAC system (multi-select), object type (multi-select), PIM assignment type, on-premises sync status
- [ ] **OBJ-03**: User can search objects by free-text (display name / UPN)
- [ ] **OBJ-04**: Filter and search state is reflected in the URL so views are bookmarkable and shareable
- [ ] **OBJ-05**: Clicking an object opens a detail panel showing: identity card, all role assignments with classification details, Administrative Unit memberships, Restricted Management AU status, owners, owned objects
- [ ] **OBJ-06**: Role assignments in the detail panel are expandable to show the full list of `RoleDefinitionActions` (permissions)
- [ ] **OBJ-07**: Each object has a full-page detail view accessible via a stable URL (navigable directly)

### Classification Template Editor

- [x] **TMPL-01**: Template editor presents all five classification files in a tabbed interface: AadResources, AppRoles, Defender, DeviceManagement, IdentityGovernance
- [x] **TMPL-02**: Each template is displayed as a structured tree grouped by tier (ControlPlane, ManagementPlane, UserAccess) then by Category and Service
- [x] **TMPL-03**: User can edit the `RoleDefinitionActions` list for any definition entry inline
- [x] **TMPL-04**: Changes are validated against the expected JSON schema before saving (Zod runtime validation)
- [x] **TMPL-05**: Saving writes back to the corresponding `Classification/Templates/*.json` file on disk
- [x] **TMPL-06**: `Classification/Global.json` exclusion list is viewable and editable in the same UI
- [x] **TMPL-07**: The UI warns the user after saving that edits should be committed to git

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### PowerShell Command Runner

- **RUN-01**: Command palette listing available EntraOps cmdlets
- **RUN-02**: Each cmdlet exposes a parameter form (RBAC system multi-select, boolean toggles, text fields)
- **RUN-03**: Running a command streams output to a terminal-style display in real time with ANSI colour support
- **RUN-04**: Only allowlisted cmdlets can be triggered (security boundary)
- **RUN-05**: Only one command can run at a time; a "Stop" button kills the running process
- **RUN-06**: Recent command history (session) shown below the terminal

### Git Change History

- **HIST-01**: List git commits that touched `PrivilegedEAM/` with date, message, and files changed
- **HIST-02**: Selecting a commit shows a file diff for the selected RBAC system's aggregate JSON
- **HIST-03**: Structured change summary: objects added, objects removed, tier changes
- **HIST-04**: User can compare any two commits (not just adjacent ones)
- **HIST-05**: Empty state when `PrivilegedEAM/` has no git history yet

### Settings

- **SETT-01**: Display `EntraOpsConfig.json` in a structured (non-raw) form
- **SETT-02**: Allow editing and saving of `EntraOpsConfig.json`
- **SETT-03**: Empty state when no config file exists yet, with instructions for `New-EntraOpsConfigFile`

### Future Roadmap Candidates

- **ATCK-01**: Privilege chain tracing — who can reach ControlPlane via nested groups or role assignments?
- **ATCK-02**: Blast radius analysis — if this identity is compromised, what can it reach?
- **ATCK-03**: Exposure scoring — rate each identity's exposure risk based on tier, assignment type, and protection status
- **AI-01**: Explain why an identity is classified at a given tier (in plain English)
- **AI-02**: Suggest remediation — e.g. "this permanent assignment should be converted to PIM eligible"
- **AI-03**: Natural language search — "show me all identities with write access to Conditional Access"
- **ALERT-01**: Alerting on new ControlPlane identities after a classification run (delivery mechanism TBD)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud hosting / SaaS | Local developer tool only — no hosted deployment |
| Real-time Microsoft Graph API calls | GUI reads from files produced by EntraOps; does not call Graph directly |
| User authentication / login screen | Single-user, single-tenant, trusted local tool |
| Multi-tenancy | EntraOps is self-contained to a single org tenant for security reasons |
| PDF / CSV export | Deferred to v2+ |
| Mobile / tablet support | Desktop browser only |
| Replacing Azure Monitor Workbooks | Complementary local tool, not a Sentinel replacement |
| Arbitrary command execution | Command runner uses explicit allowlist only; no shell passthrough |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| FOUND-02 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| FOUND-03 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| FOUND-04 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| FOUND-05 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| FOUND-06 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| FOUND-07 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| FOUND-08 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| DASH-01 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| DASH-02 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| DASH-03 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| DASH-04 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| DASH-05 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| DASH-06 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| DASH-07 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| OBJ-01 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| OBJ-02 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| OBJ-03 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| OBJ-04 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| OBJ-05 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| OBJ-06 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| OBJ-07 | Phase 1 — Foundation, Dashboard & Object Browser | Pending |
| TMPL-01 | Phase 2 — Classification Template Editor | Complete |
| TMPL-02 | Phase 2 — Classification Template Editor | Complete |
| TMPL-03 | Phase 2 — Classification Template Editor | Complete |
| TMPL-04 | Phase 2 — Classification Template Editor | Complete |
| TMPL-05 | Phase 2 — Classification Template Editor | Complete |
| TMPL-06 | Phase 2 — Classification Template Editor | Complete |
| TMPL-07 | Phase 2 — Classification Template Editor | Complete |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29 ✓
- Unmapped: 0 ✓

**Phase summary:**
- Phase 1: FOUND-01–08, DASH-01–07, OBJ-01–07 (22 requirements)
- Phase 2: TMPL-01–07 (7 requirements)

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after initialization*
