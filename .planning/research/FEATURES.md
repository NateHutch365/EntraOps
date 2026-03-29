# Feature Landscape — EntraOps GUI

**Domain:** Local security dashboard for Microsoft Entra ID privileged identity management (EAM-based)
**Researched:** 24 March 2026
**Confidence:** HIGH (Microsoft official docs for PIM/Defender XDR; HIGH domain knowledge of PAM tool patterns)

---

## Research Context

EntraOps GUI is replacing: reading raw JSON files + running KQL in Sentinel. The reference peer tools are:

- **Microsoft Entra Admin Center / PIM** — primary UI users already know
- **Microsoft Defender XDR Identity page** — richest modern identity investigation UI from Microsoft
- **Microsoft Security Exposure Management** — the SOTA for attack path visualization (Microsoft ecosystem)
- **BloodHound CE (SpectreOps)** — SOTA for AD/Entra attack graph exploration; gold standard in the community

Users are security administrators fluent with Azure/Entra UI patterns. Their bar is set by what those tools already do.

---

## Table Stakes

Features users expect from any identity management dashboard. Missing = tool feels unfinished or untrustworthy.

| Feature | Why Expected | Complexity | Phase |
|---------|--------------|------------|-------|
| **Tier summary KPI cards** | PIM dashboard has assignment counts; users want "how many ControlPlane objects?" at a glance | Low | Phase 1 |
| **Assignment type breakdown: Permanent vs Eligible** | First thing a PIM admin looks for — permanent ControlPlane assignments are the red flag | Low | Phase 1 |
| **RBAC system breakdown** | Users need to know which systems contribute most privilege; cross-system view is EntraOps's core value | Low | Phase 1 |
| **Object type breakdown (User / Group / Service Principal)** | Non-human identities (SPs, Managed Identities) classified at ControlPlane are a primary concern | Low | Phase 1 |
| **Data freshness / last-run timestamp** | Without knowing when data was collected, users can't trust it; PIM shows this; Sentinel workbooks show it | Low | Phase 1 |
| **Sortable, paginated object table** | All PAM tools lead with a principal list; users know how to use tables; TanStack Table handles this well | Medium | Phase 1 |
| **Multi-facet filtering** | Users arrive with a question: "show me all permanent ControlPlane users" — needs tier + assignment type + object type | Medium | Phase 1 |
| **Free-text search (name / UPN / objectId)** | Standard in every Azure admin tool; critical for finding one specific identity | Low | Phase 1 |
| **Filter state in URL (bookmarkable)** | Security teams share links; auditors want reproducible views; PIM and Entra Admin Center support deep linking | Medium | Phase 1 |
| **Object detail panel** | Defender XDR identity page is the reference: entity attributes + role assignments + group memberships in one place | Medium | Phase 1 |
| **Role assignment expandability (show RoleDefinitionActions)** | EntraOps users need to see *why* something is classified — the raw permission strings are the evidence | Medium | Phase 1 |
| **On-prem sync status indicator** | Hybrid environments have synced objects; their modification path differs from cloud-only objects | Low | Phase 1 |
| **Restricted Management AU status** | RMAU protection state tells users whether object is shielded from non-CP admins | Low | Phase 1 |
| **Visible empty states with instructions** | Users who fork and haven't run `Save-EntraOpsPrivilegedEAMJson` yet hit this first; must not crash or show blank screen | Low | Phase 1 |
| **Tier color-coding throughout** | Visual consistency: ControlPlane=red, ManagementPlane=amber, UserAccess=blue; users must never guess tier from a badge | Low | Phase 1 |
| **Per-object full-page URL** | Auditors need a stable URL to a specific object's detail view (for tickets, reports) | Low | Phase 1 |
| **Classification template structured view** | Users currently edit JSON by hand; they need a UI that shows tier > category > service hierarchy | Medium | Phase 2 |
| **Schema validation before save** | Writing broken JSON to `Classification/Templates/` corrupts the next classification run; essential safety gate | Medium | Phase 2 |
| **Template save with git warning** | Changes to templates must be committed; warn before writing so users don't lose track of local modifications | Low | Phase 2 |
| **Global.json exclusion list editor** | Break-glass accounts and excluded principals need a UI so users don't hand-edit JSON | Medium | Phase 2 |

---

## Differentiators

Features that set EntraOps GUI apart. Not expected from generic PAM tools, but high value for EAM users.

| Feature | Value Proposition | Complexity | Phase |
|---------|-------------------|------------|-------|
| **Cross-system unified table** | PIM shows Entra ID roles only; Defenders shows Defender only. EntraOps GUI is the only place all 5 RBAC systems (EntraID, ResourceApps, IdentityGovernance, DeviceManagement, Defender) appear together for one identity | Low-Med | Phase 1 |
| **Tier-aware visualization charts** | Bar/donut charts colored by EAM tier (0/1/2) normalise the tier concept visually; Entra Admin Center has no tier concept | Low-Med | Phase 1 |
| **Transitive membership attribution** | Show when an identity reaches a privilege tier *via group membership* vs direct assignment — "transitiveByObjectDisplayName" field is unique to EntraOps output | Medium | Phase 1 |
| **RoleDefinitionActions transparency** | No commercial tool shows the raw permission strings that determine classification. Showing why an identity is ControlPlane (the specific actions) turns this into an education tool | Medium | Phase 1 |
| **Administrative Unit membership panel** | Which tier AUs an identity belongs to; whether RMAU protection applies — this context is invisible in all standard Entra tools | Low | Phase 1 |
| **Template editor for EAM tier definitions** | No other tool offers in-browser editing of `Classification/Templates/*.json`. Eliminates risk of schema corruption via hand-editing | High | Phase 2 |
| **RoleDefinitionActions add/remove UI** | Adding a new permission string to a tier definition currently requires knowing the exact action name and editing raw JSON. A structured UI with type-ahead search from known action names is uniquely valuable | High | Phase 2 |
| **Diff preview before template save** | Before writing back to disk, show a structured diff of what tier/category/service/actions changed — unique to this tool | Medium | Phase 2 |
| **PowerShell command runner** | Run `Save-EntraOpsPrivilegedEAMJson` and watch it stream in the browser without opening a terminal — removes friction from the core workflow | High | Phase 3 |
| **Git-native change history** | Browse EAM diff between any two classification runs — object-level changes (tier changes, new privilege identities, drift) with no Sentinel workspace required | High | Phase 4 |
| **Object-level change summary** | "Since last run: 3 new ControlPlane identities, 1 tier change." No other tool produces this from local git history | High | Phase 4 |

---

## Anti-Features

Things to deliberately **not** build in v1. Each one is a trap.

| Anti-Feature | Why Avoid in v1 | What to Do Instead |
|--------------|----------------|-------------------|
| **Real-time Microsoft Graph API calls** | Authentication complexity (OIDC, tokens, scopes) would make the GUI require pre-auth setup. Users who just forked the repo can't open a browser and see anything. Defeats the "local file reader" value prop | Read `PrivilegedEAM/` JSON files via Express backend only |
| **Login / authentication screen** | Local single-user tool; the filesystem is the security boundary; adding auth adds complexity with no security benefit | No-auth by design; document in README that GUI is local-only |
| **Access review workflows (approve/deny/certify)** | That's PIM's job. EntraOps GUI has no write-path to Entra ID assignments. Implementing pseudo-reviews would confuse users about what's actually certified | Show review-relevant data (permanent assignments, never-used roles) only |
| **PDF/CSV export** | Medium complexity; requires string formatting, layout code; blocks Phase 1 velocity | Defer to post-MVP; JSON export via API endpoint is sufficient for v1 |
| **Custom alert rules UI** | Alerting requires a persistent process and notification delivery (email, webhook, Teams). The local dev server isn't that | Alerting belongs in Phase 5+; show "new since last run" in dashboard as passive signal |
| **Full Sentinel/KQL interface** | Users already have Sentinel for this. KQL integration requires Azure auth, workspace config, and API quota management. Scope creep that adds setup friction | Focus on local file consumption |
| **Lifecycle workflow management** | Entra ID Governance Lifecycle Workflows are managed in Entra Admin Center. Duplicating that UI is months of work with no differentiation | Out of scope permanently |
| **Multi-tenant support** | Single forked repo = single tenant. Multi-tenant requires auth switching, data namespacing, and security isolation. Complex for negligible v1 audience | Design data model to not preclude multi-tenant later (objectId namespacing) but don't build it |
| **Mobile / tablet responsive design** | Security dashboards are desktop-only workflows; responsive design adds CSS complexity and dilutes desktop UX | Desktop-first; document minimum viewport (1280px) |
| **Natural language search** | Requires an LLM integration or embedding model; adds latency, API cost, privacy concerns, and a new dependency. The free-text filter covers 90% of the use case | Free-text search on name/UPN/objectId is sufficient for v1 |
| **Dark mode** | Nice-to-have; adds CSS variable complexity; blocks v1 velocity | Design tokens correctly (CSS variables) so dark mode can be added later without rework |

---

## Feature Dependencies

```
URL-bookmarkable filters → URL router (React Router v7)
Object detail panel → Sortable table (click-to-open)
Classification template editor → JSON schema validation (Zod v4)
Classification template editor → File write API (Express backend)
Template diff preview → Template editor (display diff before save)
RoleDefinitionActions type-ahead → Known actions dataset (derive from existing Classification files)
Git change history → Git API (simple-git backend endpoint)
Object-level change summary → Git change history (diff parser)
PowerShell command runner → Process streaming API (Express SSE or WebSocket endpoint)
Data freshness timestamp → File stat API (Express backend reads mtime of PrivilegedEAM/ files)
Empty state detection → File stat API (same endpoint)
```

### Critical Path for Phase 1

The backend data pipeline must be established first:

```
Express API endpoint (GET /api/eam/:rbacSystem)
  → reads PrivilegedEAM/{rbacSystem}/*.json
  → parses + aggregates
  → returns normalized object array

Dashboard charts depend on: aggregated data API
Object table depends on: aggregated data API
Object detail panel depends on: per-object data (same API, filtered by objectId)
URL filter state depends on: React Router integration
```

---

## MVP Recommendation

**Phase 1 (Dashboard + Object Browser) should prioritize:**

1. Data freshness card + empty state (trust signal; build before anything else)
2. Tier KPI cards (counts per tier; core value at a glance)
3. Assignment type breakdown chart (Permanent vs Eligible per tier; primary security signal)
4. Object table with TanStack Table (sort, paginate on client)
5. Multi-facet filter bar with URL state (tier, RBAC system, object type, PIM type)
6. Free-text search
7. Object detail slide-out panel (identity card + role assignments + AU memberships)
8. RBAC system breakdown chart
9. Cross-system tab navigation (or single unified table with RBAC system column)

**Phase 2 (Template Editor) should prioritize:**

1. Template file tabs (one per RBAC system)
2. Tier > Category > Service tree display
3. RoleDefinitionActions edit-in-place (add/remove action strings)
4. Zod schema validation before write
5. Diff preview dialog before save
6. Global.json exclusion list editor
7. Git warning on save

**Defer to Phase 1 polish (not blocking MVP):**

- On-prem sync status column (data is available but low visual priority)
- Full-page object URL (slide-out panel is sufficient for v1)
- Transitive membership attribution callout in detail panel

---

## Future Phase Candidates

### Phase 3: PowerShell Command Runner

**Complexity:** High — requires streaming process execution, allowlist enforcement, ANSI rendering.

**User value:** High — the most common workflow gap. Users currently must switch to a terminal to re-run classification.

**Key UX patterns to follow:**
- Terminal-style output (dark background, monospace, ANSI colors)
- Real-time streaming via Server-Sent Events or WebSocket
- Progress indicator during execution
- Clear "running" / "stopped" / "succeeded" / "failed" status
- Session history (last N runs this browser session)
- Allowlist: hard-coded in backend; never accept arbitrary strings from client

### Phase 4: Git Change History

**Complexity:** High — requires git diff parsing, semantic change detection, UI for commit selection.

**User value:** High — "what changed between runs?" is a key audit question with no current answer outside KQL.

**Key UX patterns to follow:**
- Commit list with date, message, files-changed count
- Structured change summary: Added / Removed / Tier-changed with counts
- Per-object diff for selected commit pair
- Side-by-side or unified diff view for raw JSON (`react-diff-viewer-continued`)
- "Compare two runs" selector (not just adjacent commits)

### Phase 5+: Attack Path Analysis

**Complexity:** Very High — requires a graph data model, graph layout algorithm, and interactive visualization.

**State of the art:**
- Microsoft Security Exposure Management (enterprise) uses a **directed graph** with:
  - Choke point identification (nodes where multiple paths converge toward ControlPlane)
  - Blast radius visualization (if this identity were compromised, what can it reach?)
  - Attack path count dashboard
  - Node types: identities, groups, devices, applications, scopes
  - Edge types: MemberOf, AssignedRole, CanDelegate, OwnedBy, TransitiveMemberOf
- BloodHound CE (SpectreOps) uses **Cypher queries** on a Neo4j graph for path finding; UI is force-directed graph (Sigma.js); gold standard for AD/Entra path analysis

**EntraOps-specific attack paths that are relevant:**

| Path Type | Start Node | End Node | Edge | Notes |
|-----------|-----------|----------|------|-------|
| Tier escalation | ManagementPlane user | ControlPlane group | MemberOf (transitive) | Group nesting cross-tier |
| App role escalation | Service Principal | ControlPlane actions | HasAppRole | ResourceApps ControlPlane SP |
| Owner privilege | Service Principal | App Registration | IsOwner | SP owner can add credentials |
| AU scope bypass | Non-CP admin | CP object | NotInRMAU | Unprotected objects |

**Recommended library for v1 graph feature:** **Cytoscape.js** (MIT, React wrapper `react-cytoscapejs`) — handles graphs up to ~5,000 nodes; has built-in layouts (dagre for hierarchy, cola for force-directed); better performance than D3-force for security dashboard use cases; active development. Alternative: **Sigma.js v3** for tenants with >1,000 unique ControlPlane paths (WebGL rendering).

**Data already available in EntraOps:** `Get-EntraOpsWorkloadIdentityAttackPaths` queries Defender for Cloud attack paths via Azure Resource Graph. The `TransitiveByObjectId` / `TransitiveByObjectDisplayName` fields on EAM objects expose group-based transitivity. Building the UI overlay requires only connecting these data sources to a graph renderer.

### Phase 5+: AI / Copilot Integration

**Complexity:** Medium-High — requires LLM API integration; model selection and cost management.

**State of the art in 2025:**
- Copilot in Defender XDR (GA): natural language incident summaries, KQL query generation, remediation step explanation
- Microsoft Security Copilot: standalone LLM-powered security analyst assistant
- Emerging pattern: "explain this alert/identity in plain English" as a right-click action on any entity

**EntraOps-specific high-value use cases:**

| Use Case | Input | Output | Complexity |
|----------|-------|--------|------------|
| Explain classification | Why is this Service Principal ControlPlane? | Plain English: "This SP holds the `Application.ReadWrite.All` permission, which allows creating new app registrations and is tier 0 because it can modify authentication configuration" | Low (prompt engineering over known data) |
| Suggest remediation | Identity X is permanently assigned ControlPlane | "Consider converting to PIM-eligible assignment, or scoping to a specific Admin Unit if RMAU is not yet applied" | Medium |
| Natural language filter | "Show me all Service Principals with permanent ControlPlane access" | Pre-populated filter state | Medium (NLU → filter params) |
| Change explanation | New ControlPlane service principal detected since last run | "This new registration, added 2 days ago, has `RoleManagement.ReadWrite.Directory` — a ControlPlane API permission allowing full role manipulation" | Low-Medium |

**Privacy consideration:** Attack path and identity data must not be sent to external LLM APIs without explicit user consent. Recommend opt-in with a local model option (Ollama) or a settings flag for API key entry.

### Phase 5+: Alerting

**Complexity:** Medium — requires a persistent background process; notification delivery mechanism.

**State of the art:** Defender XDR alerts on new ControlPlane assignments; EntraOps already supports Sentinel watchlists for this. The GUI layer should surface alerts passively (dashboard badge: "3 new ControlPlane objects since last run") before building push notifications.

**Delivery options in priority order:**
1. **In-app badge** (Phase 1 stretch) — passive; no new infrastructure; show "new since last run" count on dashboard
2. **Desktop notification** (medium-term) — browser Notification API; works when GUI is open
3. **Webhook / Teams message** (long-term) — requires backend config and persistent process

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Table stakes features | HIGH | Microsoft Entra PIM docs, Defender XDR identity page docs, verified 2026 |
| Differentiator identification | HIGH | Analysis of EntraOps data schema + competitive gap analysis |
| Anti-feature rationale | HIGH | PRD Non-Goals section + scope reasoning |
| Attack path SOTA (Exposure Management) | HIGH | Official Microsoft docs (work-attack-paths-overview, verified 2026) |
| Attack path library recommendations | MEDIUM | Cytoscape.js/Sigma.js community patterns; training data aligned with current versions |
| AI integration patterns | MEDIUM | Known from Copilot in Defender XDR (GA); implementation details are training data |
| Graph data model for EntraOps paths | HIGH | Derived from actual EntraOps codebase (`TransitiveByObjectId`, attack paths cmdlet) |

---

## Sources

- Microsoft Entra PIM documentation: https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure (verified March 2026)
- Microsoft Defender XDR — Investigate an identity: https://learn.microsoft.com/en-us/defender-xdr/investigate-users (verified March 2026)
- Microsoft Security Exposure Management — Attack paths: https://learn.microsoft.com/en-us/security-exposure-management/work-attack-paths-overview (verified March 2026)
- AzurePrivilegedIAM GitHub (EntraOps classification source): https://github.com/Cloud-Architekt/AzurePrivilegedIAM (verified March 2026)
- EntraOps codebase analysis: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/INTEGRATIONS.md`
- EntraOps GUI PRD: `GUI-PRD.md` (v0.1 draft)
- Classification template files: `Classification/Templates/Classification_AadResources.json`, `Classification_AppRoles.json`
