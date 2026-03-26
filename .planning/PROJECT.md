# EntraOps GUI

## Current State

**Shipped: v1.0** ✅ (2026-03-26)

The GUI is fully functional and delivered. A user who forks EntraOps and runs `Save-EntraOpsPrivilegedEAMJson` can then `cd gui && npm install && npm run dev` to get a working local browser dashboard with:
- Tier dashboard (ControlPlane / ManagementPlane / UserAccess KPI cards, RBAC breakdown, PIM chart)
- Filterable/sortable/paginated object browser with URL-bookmarkable state and detail panel
- Safe in-browser classification template editor with Zod validation and diff preview
- PowerShell command runner (13 allowlisted cmdlets, real-time SSE streaming)
- Connect & Classify wizard (device code auth → classification → dashboard)
- Git change history browser (commit list, structured diffs, any-two-commit compare)
- Settings page for `EntraOpsConfig.json` editing

See [.planning/milestones/v1.0-ROADMAP.md](.planning/milestones/v1.0-ROADMAP.md) for full milestone archive.

## Next Milestone Goals

*Not yet defined. Run `/gsd-new-milestone` to start planning v1.1 or v2.0.*

**Known deferred items from v1.0 available as starting points:**
- HIST-05: Empty state when `PrivilegedEAM/` has no git history
- ConnectPage terminal line-spacing bug (tracked in `.planning/todos/`)
- Incomplete shared types barrel (`connect.ts`, `config.ts` not re-exported)
- Duplicate `RbacSystem` type consolidation
- Nyquist VALIDATION.md cleanup for all 6 phases
- Future roadmap candidates: alerting on new ControlPlane identities, attack path analysis, AI/Copilot integration, exposure scoring

## What This Is

EntraOps GUI is a locally-hosted web application that gives security administrators a visual interface for the EntraOps PowerShell module. It enables users to explore classified privileged identity data, edit tier classification rules, trigger automation, and track changes over time — all without leaving the repo or requiring a Microsoft Sentinel workspace. It ships in the same repository so any user who forks EntraOps gets the GUI automatically.

## Core Value

A user who has run `Save-EntraOpsPrivilegedEAMJson` can open a browser and immediately understand who holds ControlPlane access in their tenant — without writing a KQL query, opening Azure Portal, or reading raw JSON.

## Requirements

### Validated (v1.0)

All 29 v1 requirements delivered. See [.planning/milestones/v1.0-REQUIREMENTS.md](.planning/milestones/v1.0-REQUIREMENTS.md) for full traceability.
Additionally delivered 17 originally-deferred v2 requirements (RUN-01–06, CONN-01–04, HIST-01–04, SETT-01–03).

### Active

**Dashboard & Data**
- [ ] Display privileged objects broken down by EAM tier (ControlPlane, ManagementPlane, UserAccess)
- [ ] Show counts per tier by object type and RBAC system
- [ ] Show PIM assignment type breakdown (Permanent vs Eligible) per tier
- [ ] Display data freshness timestamp
- [ ] Show recent git changes widget (last 5 commits touching PrivilegedEAM/)
- [ ] Graceful empty states when no PrivilegedEAM/ data exists

**Object Browser**
- [ ] Sortable, paginated table of all privileged objects
- [ ] Multi-dimensional filtering: tier, RBAC system, object type, PIM type, on-prem sync, free-text search
- [ ] Filter state reflected in URL (bookmarkable/shareable)
- [ ] Object detail panel: identity card, role assignments, AU memberships, owners, owned objects
- [ ] Role assignments expandable to show full RoleDefinitionActions list
- [ ] Full-page object detail view navigable via URL

**Classification Template Editor**
- [ ] Tabbed interface for all five classification template files (AadResources, AppRoles, Defender, DeviceManagement, IdentityGovernance)
- [ ] Structured view grouped by tier and Category/Service
- [ ] Edit and save RoleDefinitionActions per definition entry
- [ ] JSON schema validation before writing to disk
- [ ] Global.json exclusion list viewable and editable
- [ ] Warning prompt before committing changes to git

### Out of Scope (v1)

- **Cloud hosting / SaaS** — local developer tool only; no hosted deployment
- **Real-time Graph API calls** — GUI reads from files; does not call Microsoft Graph directly
- **User authentication / multi-tenancy** — single-user, single-tenant, trusted local tool; no login
- **PDF/CSV export** — deferred to v2+
- **Mobile/tablet** — desktop browser only
- **Replacing Azure Monitor Workbooks** — complementary local tool, not a Sentinel replacement
- **PowerShell command runner (v1)** — deferred to Phase 3 post-MVP
- **Git change history browser** — deferred to Phase 4 post-MVP
- **Settings page** — deferred to Phase 5 post-MVP

### Future (Post-MVP Roadmap Candidates)

- **PowerShell command runner** — trigger and stream EntraOps cmdlets from the browser (Phase 3)
- **Git change history** — browse EAM diffs, object-level changes between runs (Phase 4)
- **Settings page** — structured editor for EntraOpsConfig.json (Phase 5)
- **Alerting / notifications** — flag new ControlPlane identities after a classification run (delivery mechanism TBD)
- **Attack path analysis** — privilege chain tracing, blast radius analysis, exposure scoring
- **AI/Copilot integration** — explain tier classifications in plain English, suggest remediation, natural language search
- **Exposure management** — quantified risk scoring for identities based on tier, assignment type, and protection status

## Context

EntraOps is a PowerShell module that classifies privileged identities in Microsoft Entra ID using an Enterprise Access Model (EAM) tier framework. It produces structured JSON output in `PrivilegedEAM/` covering multiple RBAC systems: EntraID, ResourceApps, IdentityGovernance, DeviceManagement, and Defender.

Currently, consuming this data requires reading raw JSON, running KQL in Azure Sentinel, or opening pre-built Azure Monitor Workbooks — all of which require either technical knowledge or cloud infrastructure. There is no UI for editing classification templates; users hand-edit JSON files risking schema corruption.

The primary users are:
- **Security Administrators / Identity Engineers** — want quick local review without Azure Portal
- **Security Architects / Auditors** — review ControlPlane access, may not have Sentinel access
- **EntraOps Contributors** — customise classification templates, want a safer editing experience

The codebase is a PowerShell module. The GUI will live in a `gui/` subdirectory and must not disturb the existing module structure.

## Constraints

- **Tech Stack**: React + TypeScript + Vite + Tailwind CSS + Express.js backend — established in PRD; no cloud SDK dependencies
- **Runtime**: Node.js 20+ is the only additional prerequisite beyond PowerShell 7
- **Design Language**: Microsoft / Fluent-inspired aesthetic — familiar to Azure users
- **Security**: Command runner must use a strict allowlist; no arbitrary code execution; all file writes validated via Zod schema
- **Cross-platform**: Must work on Windows, macOS, and Linux
- **Fork-friendly**: Lives in `gui/` subdirectory; `npm run dev` starts everything; no extra setup beyond `npm install`
- **No auth**: Local tool, single user, no login screen

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + TypeScript + Vite for frontend | Component model suits data-heavy dashboard; strong TypeScript ecosystem; fast dev server | — Pending |
| Tailwind CSS for styling | Utility-first, no design system lock-in, matches Fluent design direction | — Pending |
| TanStack Query v5 for data fetching | Loading/error states; cache invalidation after command runs | — Pending |
| TanStack Table v8 for object browser | Headless; handles sort/filter/pagination on large object sets | — Pending |
| Express.js backend (TypeScript via tsx) | Minimal bridge between React and filesystem, git, PowerShell | — Pending |
| simple-git for git access | Passes args as arrays; no shell injection risk | — Pending |
| Zod for schema validation | Runtime validation of JSON files before writing to disk | — Pending |
| MVP = Phases 1–2 only | Dashboard + object browser + template editor is enough to validate core value | — Pending |
| Attack path / AI features deferred post-MVP | Ambitious scope; need core data exploration working first | — Pending |
| Multi-tenancy explicitly out of scope | EntraOps is self-contained to a single org tenant for security reasons | — Pending |

---
*Last updated: 2026-03-24 after initialization*
