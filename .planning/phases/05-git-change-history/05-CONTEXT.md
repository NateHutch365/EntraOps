# Phase 5: Git Change History — Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse the EAM change history from the browser, understand what changed between classification runs, and compare any two snapshots — without opening a terminal or git CLI. This phase adds a dedicated History page with a paginated commit list, inline structured change summaries, and a full-page comparison view for any two commits. Object-level reclassification (overriding tier assignments) is explicitly out of scope — that is Phase 5.5.

</domain>

<decisions>
## Implementation Decisions

### A. Commit List Layout & Pagination

**Same format as the dashboard widget, extended.** No date grouping — a flat chronological list keeps it simple and consistent with what users already see on the dashboard. The dashboard widget becomes a preview of this page.

**Per-row metadata:** `hash` (7 chars), `message`, `author`, `date` — same fields as the existing `GitCommit` shared type. No per-row change counts — computing a diff for every commit on page load is too expensive. Change summary is computed lazily on expand only.

**Pagination:** 20 commits per page. Standard page controls (prev / next / page number). Server-side, following the same pagination pattern as the Object Browser.

**Interaction:** Clicking a commit row expands it inline — the change summary loads in an expandable section below the row. No navigation away from the list for single-commit view.

**Commits with no `PrivilegedEAM/` changes still appear in the list.** They are not filtered out silently — a security reviewer needs to see the full timeline and understand what changed in adjacent commits. A commit that touched only `Classification/` shows the commit metadata but its expanded section says "No PrivilegedEAM/ changes in this commit."

### B. Structured Change Summary

**Three-section structure in every expanded commit and comparison view:**
1. **ControlPlane changes** — shown first, always, even if empty (signals that ControlPlane was reviewed). Visually distinct (stronger background / border) to match the risk level.
2. **ManagementPlane changes**
3. **UserAccess changes**

**Within each tier section, three subsections:**
- **Added** — ObjectId not present in the parent commit snapshot. Unclassified → named tier is a "tier change", not an add.
- **Removed** — ObjectId present in parent but absent in this commit.
- **Tier changed** — ObjectId present in both; tier value differs.

**"Why did the tier change?" is shown.** For each tier-changed object, the summary shows the role assignments that were added or removed between the two snapshots that caused the tier shift. Format: the delta role assignments (added shown in green, removed in red) with their `RoleDefinitionName` and the tier they belong to. This requires diffing the object's `RoleAssignments` array between snapshots — the planner must account for this.

**Per RBAC system, not deduplicated.** A service principal appearing in both EntraID and ResourceApps shows as two separate entries — one per system. Users already navigate in RBAC system terms throughout the app; merging across systems would hide context.

### C. Comparison UX

**Selection:** Checkboxes on each commit row in the list. When exactly 2 rows are checked, a sticky bar appears at the bottom of the page: "Comparing 2 commits — [Compare]". Selecting a 3rd commit deselects the oldest. Checkboxes are the only selection mechanism — no "compare with..." picker.

**Comparison view:** Full-page route at `/history/compare?from={hash}&to={hash}`. Navigates away from the list. The comparison view header shows both commit hashes (short), messages, authors, and dates side by side so the user knows what they're comparing.

**Comparison content:** Same structured change summary format as single-commit view (ControlPlane first, then ManagementPlane, UserAccess), but computed as the diff between the two named commits (not commit vs. parent). Below the structured summary, a **"Raw JSON diff"** toggle reveals the raw unified diff of the aggregate file — collapsed by default, expanded on click.

**URL-addressable.** `/history/compare?from=abc1234&to=def5678` is a stable shareable link that loads the comparison directly. The history page commit list has no pre-selected checkboxes on load — the compare URL only activates the comparison view page.

### D. RBAC System Filter & Diff Scope

**Tabs per changed RBAC system** in both the expanded single-commit view and the comparison page. Only systems with changes in that commit/range get a tab — a commit that only touched EntraID shows one tab. Tab order matches the standard system order throughout the app: EntraID | ResourceApps | IdentityGovernance | DeviceManagement | Defender.

**Raw JSON diff uses the aggregate file** per RBAC system (e.g. `PrivilegedEAM/EntraID/EntraID.json`, `PrivilegedEAM/ResourceApps/ResourceApps.json`). Individual object files (e.g. `EntraID/user/abc123.json`) are not diffed — a single commit could touch 50+ individual files, which would be unreadable noise.

**RBAC system filter on the history page.** A multi-select filter above the commit list (same chip pattern as Object Browser) lets a reviewer filter to only show commits that touched a specific RBAC system. This is a client-side filter on commit metadata (affected files), not a re-fetch. If a commit touched none of the selected systems it is hidden from the list.

### Claude's Discretion
- Exact checkbox and sticky comparison bar styling
- Loading skeleton while change summary is being computed on expand
- Empty state copy for commits with no PrivilegedEAM/ changes
- Exact raw diff rendering (plain `<pre>` with syntax highlighting, or a lightweight diff renderer — must NOT require Monaco)
- Page title and sidebar nav label for the History page

</decisions>

<specifics>
## Specific Notes

- The ControlPlane section must always render first and be visually distinct — this is the primary signal a security reviewer is looking for. Even an empty "No ControlPlane changes" section is meaningful.
- The "why did the tier change" requirement (B1) is the most implementation-intensive part of the phase. The planner must design a diff algorithm that compares `RoleAssignments` arrays between two snapshots to identify which specific assignments caused the tier shift. This should be server-side.
- For the comparison route, `from` and `to` are short hashes (7 chars) as used throughout the app. The server must resolve them to full hashes for `simple-git` lookup if needed.
- Aggregate file paths per RBAC system: `PrivilegedEAM/EntraID/EntraID.json`, `PrivilegedEAM/ResourceApps/ResourceApps.json`. Defender, IdentityGovernance, and DeviceManagement directories are currently empty in this repo — the implementation must handle missing aggregate files gracefully (show "No data for this system in this commit" rather than erroring).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` §Git Change History — HIST-01 through HIST-05
- `.planning/ROADMAP.md` §Phase 5 — success criteria (3 conditions that must be TRUE)

### Architecture & Stack Decisions
- `.planning/STATE.md` §Decisions — locked technology choices (Tailwind v4, Express v5, Zod v4, simple-git, server-side pagination)
- `.planning/phases/01-foundation-dashboard-object-browser/01-CONTEXT.md` — pagination pattern, filter chip pattern, Object Browser UX (filter bar above table, live re-fetch, dismissible chips)
- `.planning/phases/02-classification-template-editor/02-CONTEXT.md` — tab pattern (RBAC system tabs will follow the same shadcn/ui Tabs implementation)

### Existing Code to Extend
- `gui/server/services/gitLog.ts` — `simple-git` instance with `ENTRAOPS_ROOT` env var; `getRecentPrivilegedEAMCommits` — extend this service rather than creating a new one
- `gui/server/routes/git.ts` — existing `GET /api/git/recent`; new routes mount here
- `gui/shared/types/api.ts` — `GitCommit` type already defined; new types for change summary and comparison extend this file

### Source Data
- `PrivilegedEAM/EntraID/EntraID.json` — representative aggregate file shape
- `PrivilegedEAM/ResourceApps/ResourceApps.json` — second aggregate file; others (Defender, IdentityGovernance, DeviceManagement) currently empty — handle gracefully

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gui/server/services/gitLog.ts` — `simpleGit(REPO_ROOT)` instance already configured; `getRecentPrivilegedEAMCommits(count)` for the list. Extend with: `getCommitDetail(hash)`, `getCommitComparison(from, to)`, `getRbacSystemDiff(from, to, rbacSystem)`.
- `gui/server/routes/git.ts` — existing router; add new routes here: `GET /api/git/commits`, `GET /api/git/commits/:hash`, `GET /api/git/compare`.
- `gui/shared/types/api.ts` — `GitCommit` type (hash, message, author, date) already defined; new types needed: `CommitChangeSummary`, `ObjectChange`, `RoleAssignmentDelta`, `ComparisonResult`.
- `gui/client/src/components/` — filter chip pattern from Object Browser, tab pattern from Template Editor — both reusable for the History page filter and RBAC system tabs.
- `simple-git` — already installed; `git.show()` and `git.diff()` methods available for fetching file content at a specific commit.

### New Routes Needed
- `GET /api/git/commits?page=N&pageSize=20&rbac[]=EntraID` — paginated commit list with optional RBAC filter
- `GET /api/git/commits/:hash` — single commit detail with structured change summary
- `GET /api/git/compare?from={hash}&to={hash}` — comparison structured summary + raw diff

### New Page
- `gui/client/src/pages/HistoryPage.tsx` — paginated commit list with filter bar, checkboxes, sticky compare bar; mounts at `/history`; add to Sidebar nav
- `gui/client/src/pages/ComparePage.tsx` — full-page comparison view; mounts at `/history/compare`

</code_context>

<deferred_ideas>
</deferred_ideas>
