# EntraOps GUI — Product Requirements Document

**Version:** 0.1 (draft)
**Branch:** `feature/frontend-gui`
**Status:** Planning

---

## 1. Overview

EntraOps GUI is a locally-hosted web application that gives security administrators a visual interface for the EntraOps PowerShell module. It enables users to explore classified privileged identity data, edit tier classification rules, trigger automation, and track changes over time — all without leaving the repo or requiring a Microsoft Sentinel workspace.

---

## 2. Problem Statement

EntraOps produces rich, structured security data about privileged identities in Microsoft Entra ID, but consuming that data today requires:

- Reading raw JSON files in `PrivilegedEAM/`
- Running KQL queries in an Azure Sentinel workspace
- Opening pre-built Azure Monitor Workbooks (requires a Log Analytics workspace)

This creates a barrier for teams who want to review classification results locally, share findings with colleagues, or audit changes across runs without standing up cloud infrastructure. There is also no UI for editing classification templates — users must hand-edit JSON files, risking schema errors.

---

## 3. Target Users

**Primary: Security Administrator / Identity Engineer**
- Manages privileged access in Microsoft Entra ID for their organisation
- Has forked EntraOps and configured GitHub Actions to run classification on a schedule
- Comfortable with PowerShell; not necessarily a web developer
- Wants to review classification results quickly without opening Azure Portal

**Secondary: Security Architect / Auditor**
- Needs to review what identities hold Control Plane access and why they are classified that way
- May not have access to the Sentinel workspace but has repo read access
- Values the ability to share a filtered view of results (bookmarkable URLs)

**Tertiary: EntraOps Contributor**
- Maintains or customises classification templates for their tenant
- Currently edits `Classification/Templates/*.json` by hand; wants a safer, validated editing experience

---

## 4. Goals

1. **Lower the barrier to reviewing results** — a user can run `npm run dev` and immediately explore their classified EAM data in a browser, with no cloud dependency.
2. **Make classification templates approachable** — eliminate hand-editing of JSON tier definition files; provide a structured, validated editor.
3. **Enable operational workflows from the browser** — trigger the most common EntraOps cmdlets without opening a terminal.
4. **Surface change history** — let users understand what changed between classification runs (new privileged objects, tier changes, protection drift).
5. **Stay fork-friendly** — the GUI ships in the same repo so users get it automatically when they fork, with no extra setup beyond `npm install`.

---

## 5. Non-Goals (Out of Scope)

- **Cloud hosting / SaaS** — this is a local developer tool, not a hosted service.
- **Real-time Graph API queries** — the GUI reads from files produced by EntraOps cmdlets; it does not call Microsoft Graph directly.
- **User authentication / multi-tenancy** — the GUI is single-user, local, trusted. No login screen.
- **Custom reporting / export** — no PDF/CSV export in v1.
- **Mobile / tablet support** — desktop browser only.
- **Replacing Azure Monitor Workbooks** — the GUI complements them for local use; it does not replicate Sentinel functionality.

---

## 6. Functional Requirements

### 6.1 Dashboard (Overview)

| ID | Requirement |
|----|-------------|
| F-01 | Display a summary of privileged objects broken down by EAM tier: ControlPlane (0), ManagementPlane (1), UserAccess (2) |
| F-02 | Show counts per tier by object type (User, Group, Service Principal) |
| F-03 | Show counts per tier per RBAC system (EntraID, ResourceApps, IdentityGovernance, DeviceManagement, Defender) |
| F-04 | Show PIM assignment type breakdown (Permanent vs Eligible) per tier |
| F-05 | Show a "recent changes" widget listing the last 5 git commits that touched `PrivilegedEAM/` |
| F-06 | Display data freshness: timestamp of the most recently written `PrivilegedEAM/` file |
| F-07 | Show an empty state with setup instructions when no `PrivilegedEAM/` data exists yet |

### 6.2 Privileged Object Browser

| ID | Requirement |
|----|-------------|
| F-08 | Display all privileged objects in a sortable, paginated table |
| F-09 | Filter objects by: tier (multi-select), RBAC system (multi-select), object type (multi-select), PIM assignment type, on-premises sync status, free-text search (display name / UPN) |
| F-10 | Filter state is reflected in the URL (bookmarkable, shareable) |
| F-11 | Clicking an object opens a detail panel showing: identity card, all role assignments with classification details, Administrative Unit memberships, Restricted Management AU status, owners, owned objects |
| F-12 | Role assignments are expandable to show the full list of `RoleDefinitionActions` (permissions) |
| F-13 | A full-page detail view is available for each object (navigable via URL) |

### 6.3 Classification Template Editor

| ID | Requirement |
|----|-------------|
| F-14 | Display all five classification template files in a tabbed interface: AadResources, AppRoles, Defender, DeviceManagement, IdentityGovernance |
| F-15 | Each template is presented as a structured view grouped by tier (ControlPlane, ManagementPlane, UserAccess) and then by Category / Service |
| F-16 | Users can edit the `RoleDefinitionActions` list for any definition entry |
| F-17 | Changes are validated against the expected JSON schema before saving |
| F-18 | Saving writes back to the corresponding `Classification/Templates/*.json` file on disk |
| F-19 | The `Classification/Global.json` exclusion list is also viewable and editable |
| F-20 | The UI warns the user that edits should be committed to git |

### 6.4 PowerShell Command Runner

| ID | Requirement |
|----|-------------|
| F-21 | Provide a command palette listing the available EntraOps cmdlets |
| F-22 | Each cmdlet exposes a parameter form appropriate to its inputs (RBAC system multi-select, boolean toggles, text fields) |
| F-23 | Running a command streams output to a terminal-style display in real time |
| F-24 | Terminal output preserves PowerShell ANSI color coding (Write-Host colours, progress bars) |
| F-25 | Only an explicit allowlist of cmdlets can be triggered via the UI (security boundary) |
| F-26 | Only one command can run at a time; a second run attempt shows a clear error with an option to stop the current command |
| F-27 | A "Stop" button kills the running process |
| F-28 | Recent command history (this session) is shown below the terminal |

**Allowlisted cmdlets (v1):**
`Connect-EntraOps`, `Disconnect-EntraOps`, `Save-EntraOpsPrivilegedEAMJson`, `Get-EntraOpsPrivilegedEAM`, `Update-EntraOpsPrivilegedAdministrativeUnit`, `New-EntraOpsPrivilegedAdministrativeUnit`, `Update-EntraOpsPrivilegedConditionalAccessGroup`, `New-EntraOpsPrivilegedConditionalAccessGroup`, `Update-EntraOpsPrivilegedUnprotectedAdministrativeUnit`, `Update-EntraOpsClassificationFiles`, `Get-EntraOpsCacheStatistics`, `Clear-EntraOpsCache`

### 6.5 Change History

| ID | Requirement |
|----|-------------|
| F-29 | List git commits that touched files in `PrivilegedEAM/`, showing date, message, and files changed |
| F-30 | Selecting a commit shows a file diff for the selected RBAC system's aggregate JSON |
| F-31 | A structured change summary shows: objects added, objects removed, objects whose tier changed |
| F-32 | Users can compare any two commits (not just adjacent ones) |
| F-33 | Show an empty state when `PrivilegedEAM/` has no git history yet |

### 6.6 Settings

| ID | Requirement |
|----|-------------|
| F-34 | Display the current `EntraOpsConfig.json` in a structured (non-raw) form |
| F-35 | Allow editing and saving of `EntraOpsConfig.json` |
| F-36 | Show a helpful empty state when no config file exists yet, with instructions for `New-EntraOpsConfigFile` |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-01 | **Cross-platform**: works on Windows, macOS, and Linux |
| NF-02 | **Fork-friendly**: lives in `gui/` subdirectory; users get it when they fork the repo |
| NF-03 | **Single command startup**: `npm run dev` starts both frontend and backend |
| NF-04 | **No cloud dependency**: reads local files only; no Azure/Microsoft calls |
| NF-05 | **Node.js 20+** is the only additional prerequisite beyond PowerShell 7 |
| NF-06 | **Security**: the command runner only executes cmdlets from the allowlist; no arbitrary code execution |
| NF-07 | **Security**: all file writes (templates, config) are validated against schema before touching disk |
| NF-08 | **Resilience**: graceful empty states when files are missing; no crash on fresh fork |
| NF-09 | **No auth**: local-only tool, single user, no login required |

---

## 8. Technical Stack (Recommended)

| Layer | Technology | Rationale |
|---|---|---|
| Frontend framework | React + TypeScript + Vite | Component model suits data-heavy dashboard; strong ecosystem; fast dev server |
| Styling | Tailwind CSS | Utility-first, easy to customise, no design system lock-in |
| Data fetching | TanStack Query v5 | Loading/error states, cache invalidation after command runs |
| Table | TanStack Table v8 | Headless; handles sort/filter/pagination on large object sets |
| Charts | Recharts | Pure React components; no D3 peer dependency issues |
| Terminal output | `ansi-to-html` | Converts PowerShell ANSI escape codes for in-browser rendering |
| Diff view | `react-diff-viewer-continued` | Side-by-side git diff rendering |
| Backend | Express.js + Node.js (TypeScript via `tsx`) | Minimal; bridges React to filesystem, git, and PowerShell |
| Git access | `simple-git` | Passes arguments as arrays; no shell injection risk |
| Schema validation | Zod | Runtime validation of JSON files before writing to disk |
| Process management | `concurrently` + `nodemon` | Single `npm run dev` command for both servers |

---

## 9. Proposed Build Phases

| Phase | Scope | Deliverable |
|---|---|---|
| 1 | Project scaffold + data pipeline + dashboard + object browser | Working read-only dashboard from real `PrivilegedEAM/` data |
| 2 | Classification template editor | In-browser editing of tier definition JSON files |
| 3 | PowerShell command runner | Trigger and stream EntraOps cmdlets from the browser |
| 4 | Git change history | Browse EAM change history, object-level diffs |
| 5 | Settings page + polish + README | Production-ready `gui/` with documentation |

---

## 10. Success Metrics

- A user who has forked EntraOps and run `Save-EntraOpsPrivilegedEAMJson` can open the dashboard and identify all ControlPlane identities in under 60 seconds.
- A user can edit a classification template entry and save it without touching a JSON file manually.
- A user can trigger `Save-EntraOpsPrivilegedEAMJson` and watch it complete from the browser.
- A user can identify what changed between two classification runs by browsing the history page.
