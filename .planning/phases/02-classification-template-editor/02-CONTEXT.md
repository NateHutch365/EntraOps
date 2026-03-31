# Phase 2: Classification Template Editor — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Security admins and EntraOps contributors can safely edit EAM tier classification templates in-browser, with schema validation and diff preview, eliminating the need to hand-edit JSON files. Scope: read, edit, validate, and write the five `Classification/Templates/*.json` files and `Classification/Global.json`. No PowerShell execution, no git commit triggering, no new template creation — those are out of scope.

</domain>

<decisions>
## Implementation Decisions

### A — Tree Layout & Entry Navigation
- Top-level tabs: one per template file (AadResources, AppRoles, Defender, DeviceManagement, IdentityGovernance) + a "Global Exclusions" tab — six tabs total, matching TMPL-01 and TMPL-06
- Within each template tab: shadcn/ui Accordion, one panel per tier (ControlPlane, ManagementPlane, UserAccess) — collapsed by default, expand-on-click
- Within each open tier: flat scrollable list of Category/Service entries as cards; each card shows `Category` + `Service` as the header and is itself clickable/expandable to reveal the edit surface
- No sidebar navigation within the tab — the accordion tiers are the only navigation layer needed given typical file sizes

### B — RoleDefinitionActions Edit Surface
- Each definition entry's `RoleDefinitionActions` list renders as dismissible pill chips (one chip per action string)
- Below the chip list: a single text input with "Add action" placeholder — pressing Enter or clicking an Add button appends the value as a new chip
- Clicking the × on a chip removes it immediately (no confirm — Zod validation + diff preview are the safety net)
- The action string format (`microsoft.directory/...`) should be preserved exactly; no autocomplete in v1
- `RoleAssignmentScopeName` is displayed read-only alongside the entry header (not editable in v1 — scope changes are rare and high-risk)

### C — Diff Preview Interaction
- The per-entry save flow is: Edit → "Preview Changes" button (replaces a plain Save button) → shadcn/ui Dialog opens showing a unified diff of the full JSON file (before vs after) → "Confirm & Save" button inside the dialog triggers the atomic write
- The diff is rendered as syntax-highlighted text (additions in green, removals in red) — a simple line-diff renderer, not a full Monaco diff view
- "Cancel" in the dialog discards the save attempt and returns the user to editing with their changes intact
- Validation (Zod) runs when "Preview Changes" is clicked, before the dialog opens — if validation fails, an inline error is shown on the entry card instead of opening the dialog

### D — Global.json Editing & Post-Save Warning
- `Classification/Global.json` exclusion list (`ExcludedPrincipalId`) is edited as a structured list: each GUID is a row with a delete (trash) button; an "Add GUID" text input at the bottom appends on Enter
- No autocomplete or lookup — GUIDs are pasted in; basic UUID format validation only (Zod uuid())
- Post-save git warning: a persistent yellow dismissible banner (`Alert` component) at the top of the page after any successful save — "Changes saved to disk — remember to commit to git before running EntraOps classification"; dismissed per-session, reappears after the next save
- The warning is NOT a blocking modal — saving is already confirmed via the diff dialog; the banner is a reminder only

### Claude's Discretion
- Exact chip/pill visual styling (colours, border radius, font size)
- Diff renderer library or manual implementation choice
- Accordion expand animation timing
- Whether to show entry count per tier in the accordion header (e.g. "ControlPlane (14 entries)")
- Exact "Add action" input placement (inline below chips or in a popover)
- Loading skeleton while template files are being read from disk
- Tab order within the six-tab interface

</decisions>

<specifics>
## Specific Ideas

- `RoleAssignmentScopeName` read-only in v1: scope values are typically `["/*"]` (global) and editing them has high blast-radius potential. Display them as a static badge on the entry card so they're visible but not accidentally changeable.
- The diff dialog should show the full file diff, not just the changed entry — this makes it clear which file will be written and gives the user the full picture before confirming.
- Zod validation should mirror the actual JSON schema of each template file — the planner should read the existing template files to derive the schema shape rather than guessing.
- The six-tab interface from TMPL-01 and TMPL-06 is the primary navigation: AadResources | AppRoles | Defender | DeviceManagement | IdentityGovernance | Global Exclusions.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` §Classification Template Editor — full requirement list for TMPL-01–07
- `.planning/ROADMAP.md` §Phase 2 — success criteria (4 conditions that must be TRUE)

### Architecture & Stack Decisions
- `.planning/STATE.md` §Decisions — locked technology choices (Tailwind v4, Express v5, Zod v4, shadcn/ui, atomic writes)
- `.planning/phases/01-foundation-dashboard-object-browser/01-CONTEXT.md` — Phase 1 decisions (app shell, sidebar, design patterns to stay consistent with)

### Source Files Being Edited
- `Classification/Templates/Classification_AadResources.json` — representative schema; all five files follow the same top-level structure: array of `{ EAMTierLevelName, EAMTierLevelTagValue, TierLevelDefinition[] }`
- `Classification/Global.json` — shape: `[{ ExcludedPrincipalId: string[] }]`
- `Classification/Templates/Classification_AadResources.Param.json` — ARM parameter wrapper; NOT edited by the GUI (read-only reference)

### Phase 1 Patterns to Reuse
- Atomic write pattern: temp file → rename (established in Phase 1 STATE.md decisions)
- `import.meta.dirname` for all file-relative path resolution in Express routes
- Security middleware: path traversal guard (`resolved.startsWith(BASE + path.sep)`) must be applied to all new write endpoints
- shadcn/ui components in use: Sheet, Accordion, Dialog, Alert, Badge — all available from Phase 1 scaffold

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets from Phase 1
- `gui/server/routes/` — three existing route files as patterns for the new `/api/templates` route set
- `gui/client/src/components/` — shared UI components from Phase 1 (design system already initialised)
- `gui/shared/types/` — existing type files; Phase 2 adds template-specific types alongside them
- Server security middleware already wired — new routes inherit it automatically

### Template File Structure (from direct inspection)
```
Classification/Templates/Classification_AadResources.json:
[
  {
    "EAMTierLevelName": "ControlPlane",
    "EAMTierLevelTagValue": "0",
    "TierLevelDefinition": [
      {
        "Category": "Microsoft.AzureAD",
        "Service": "Application and Workload Identity",
        "RoleAssignmentScopeName": ["/*"],
        "RoleDefinitionActions": ["microsoft.directory/..."]
      }
    ]
  },
  ...  // ManagementPlane, UserAccess follow same shape
]
```

### Integration Points for Phase 2
- New Express routes needed: `GET /api/templates` (list all), `GET /api/templates/:name` (read one), `PUT /api/templates/:name` (atomic write), `GET /api/templates/global` / `PUT /api/templates/global` (Global.json)
- All write endpoints need: Zod validation, path traversal guard asserting path stays within `Classification/Templates/`, atomic temp-rename write
- Client route: new `/templates` page registered in `App.tsx` alongside existing routes; sidebar nav entry added

### Files NOT to Touch
- `Classification/Templates/Classification_AadResources.Param.json` — ARM parameter wrapper, not edited
- `PrivilegedEAM/` — Phase 2 does not read or write EAM output files
- Existing Phase 1 routes (`dashboard.ts`, `git.ts`, `objects.ts`) — no modifications needed

</code_context>

<deferred>
## Deferred Ideas

- **Scope editing for RoleAssignmentScopeName** — high blast-radius; deferred to a future phase or settings
- **Autocomplete for RoleDefinitionActions** — would require a registry of valid Microsoft Graph permission strings; deferred
- **Git commit triggering from the UI** — noted during Phase 1 verification as a user desire; belongs in Phase 3 (PowerShell Command Runner) scope discussion, not Phase 2
- **New template entry creation** — adding a new Category/Service entry is out of scope for v1; only editing existing entries

</deferred>

---

*Phase: 02-classification-template-editor*
*Context gathered: 2026-03-25*
