# Phase 1: Foundation, Dashboard & Object Browser — Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a fully working read-only local web app: scaffold, security baseline, data pipeline, tier dashboard, and paginated/filterable object browser — all driven from real `PrivilegedEAM/` JSON files. A security admin can run `npm run dev` and immediately explore who holds ControlPlane access in their tenant. Creating or editing data is out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout & Information Hierarchy
- Three equal-width KPI cards in a row: ControlPlane / ManagementPlane / UserAccess
- RBAC system breakdown: stacked bar chart per tier (shows composition within each tier)
- PIM assignment type (Permanent vs Eligible): secondary stat tucked inside each tier KPI card — not a standalone chart
- Recent git commits widget: commit message + timestamp only (no per-commit file list)

### Object Browser Filter Panel UX
- Filter controls: top bar above the table (dropdowns per dimension — tier, RBAC system, object type, PIM type, on-prem sync)
- Filter trigger: live re-fetch on every selection change (no Apply button — Express is local, latency is negligible)
- Active filter visibility: dismissible chips displayed below the filter bar so users can always see and clear what's active
- Search box: always visible in the top bar, to the left of or above the filter dropdowns

### Object Detail — Panel & Full-Page
- Primary click interaction: opens a slide-out panel (shadcn/ui `<Sheet>`); table remains visible behind it
- Full-page detail view: accessible via a permalink link inside the slide-out panel (not the primary click action)
- Identity card header: Display Name (large) + UPN or AppId + ObjectType badge + highest tier badge + OnPremSync indicator
- Role assignments: grouped by RBAC system (EntraID section, ResourceApps section, etc.) — not a flat list
- RoleDefinitionActions expansion: truncated to 5 items with a "show all" link that expands inline

### App Shell, Sidebar & States
- Sidebar: collapsible; starts expanded with full labels; toggle collapses to icon-only
- Loading state between filter/page changes: overlay + spinner over previous stale rows (no full skeleton flash per change)
- Empty state (no `PrivilegedEAM/` data): show the exact command to run (`Save-EntraOpsPrivilegedEAMJson`) + link to docs + "Check again" refresh button
- Error handling: per-widget inline failures — a broken/corrupted file fails its own card only; rest of dashboard stays functional

### Claude's Discretion
- Exact chart colours and spacing within tier KPI cards
- Stacked bar chart orientation (horizontal preferred for readability, but vertical acceptable)
- Chip styling for active filters
- Exact sidebar width in expanded and collapsed states
- Shimmer/spinner visual style for the loading overlay

</decisions>

<specifics>
## Specific Ideas

- The stacked bar RBAC chart should make it easy to answer "what RBAC systems contribute to ControlPlane?" at a glance — composition per tier is the story, not comparison across tiers
- OnPremSync is a meaningful risk signal and should be immediately visible in the identity card header, not buried in a details section
- Per-widget error messages should include enough context to be actionable (e.g. "Could not read EntraID data — check file permissions on PrivilegedEAM/EAM_EntraID_*.json")

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` §Foundation, §Dashboard, §Object Browser — full requirement list for FOUND-01–08, DASH-01–07, OBJ-01–07
- `.planning/ROADMAP.md` §Phase 1 — success criteria (5 conditions that must be TRUE)

### Architecture & Stack Decisions
- `.planning/STATE.md` §Decisions — locked technology choices (Tailwind v4, Express v5, Zod v4, shadcn/ui, server-side pagination, React Router v7, nuqs, atomic writes, BOM stripping)
- `.planning/phases/01-foundation-dashboard-object-browser/01-RESEARCH.md` — full stack version table, installation commands, and per-requirement implementation approach

### Design System
- `GUI-PRD.md` — original PRD; Microsoft Fluent colour tokens and Segoe UI Variable font requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — `gui/` does not exist yet; this phase creates it from scratch

### Established Patterns
- `PrivilegedEAM/` JSON structure: objects have `ObjectType`, `ObjectAdminTierLevelName`, `RoleSystem`, `PIMAssignmentType`, `OnPremSyncEnabled`, `RoleDefinitionActions` — all filter/sort dimensions map directly to these fields
- `Classification/Templates/*.json`: AadResources, AppRoles, Defender, DeviceManagement, IdentityGovernance — Phase 2 will need to edit these; Phase 1 data pipeline should not touch them
- PowerShell writes UTF-8 with BOM (`\uFEFF`) — all `JSON.parse()` calls on `PrivilegedEAM/` files must strip the BOM before parsing

### Integration Points
- Express backend reads from `../../PrivilegedEAM/` relative to `gui/server/` — path must be configurable and normalised to forward-slashes before sending to client
- `simple-git` reads from the repo root (two levels above `gui/`) — initialise with the repo root path, not the `gui/` directory
- Shared types in `gui/shared/types/` must model both the raw JSON shape (server reads) and the API response shape (client receives) without duplication

</code_context>

<deferred>
## Deferred Ideas

- None raised during discussion — scope stayed within Phase 1 boundaries

</deferred>

---

*Phase: 01-foundation-dashboard-object-browser*
*Context gathered: 2026-03-24*
