# Research Summary — EntraOps GUI

**Project:** EntraOps GUI (local-first React security dashboard)
**Domain:** Microsoft Entra ID privileged identity management — file-driven, single-tenant, desktop-only
**Researched:** 24 March 2026
**Confidence:** HIGH (all stack decisions verified against live npm registry and official docs)

---

## Executive Summary

EntraOps GUI is a local developer tool, not a SaaS product. The right mental model is VS Code's webview or GitHub Desktop — a trusted, single-user UI that bridges a CLI tool (EntraOps PowerShell module) and a browser. This framing drives every architectural decision: no auth, no cloud dependencies, Express binds to `127.0.0.1`, file system is the security boundary. The codebase lives in `gui/` inside the existing PowerShell repo so any user who forks EntraOps gets the GUI automatically. `npm run dev` must be the entire setup story.

The recommended stack has four PRD corrections that require conscious decisions upfront: **Tailwind v4** (not v3 — CSS-first, different config), **Express v5** (not v4 — async middleware, security fixes), **Zod v4** (not v3 — 14x faster, is now the npm default), and **Node.js 22 minimum** (v20 is EOL as of March 2026). Additionally, **React Router v7** is a required addition the PRD omitted — URL-reflected filter state (F-10) cannot be done without it. UI components use **shadcn/ui** (not Fluent UI v9): Fluent's Griffel CSS-in-JS fundamentally conflicts with Tailwind's utility approach; Fluent aesthetics are achieved via CSS custom properties in the Tailwind `@theme` block instead.

The primary security risks are concentrated in two future phases: **Phase 3** (PowerShell runner — shell injection is catastrophic if `exec()` is used instead of `spawn()` with array args) and **Phase 2** (template editor — arbitrary file write without schema validation silently corrupts classification output). Phase 1 has one critical baseline requirement: Express must bind to `127.0.0.1` explicitly and all file-read routes must apply path traversal guards. These are not optional hardening — they are required for the tool to be safe on a corporate laptop.

---

## Key Findings

### 1. Recommended Stack

The final verified library list for March 2026. PRD corrections are flagged.

#### Frontend

| Library | Version | Role | Notes |
|---------|---------|------|-------|
| React | 19.2 | UI framework | React Compiler v1.0 stable; Actions; `use()` hook |
| TypeScript | 5.8+ | Type safety | No change from PRD |
| Vite | 8.0.2 | Build + dev server | Use `@vitejs/plugin-react` + `@tailwindcss/vite` |
| **Tailwind CSS** | **4.2.2** | Styling | ⚠️ PRD assumed v3; v4 is CSS-first, no `tailwind.config.js` |
| shadcn/ui | CLI v4 (Mar 2026) | Component library | Copied into codebase — not a dependency; Tailwind v4 + React 19 support |
| Lucide React | 1.6.0 | Icons | Required companion to shadcn/ui |
| @fluentui/react-icons | latest | Fluent icons | Optional; use selectively for tier/identity type badges |
| Sonner | 2.0.7 | Toast notifications | Replaces old shadcn toast component |
| TanStack Query | 5.95.2 | Data fetching + caching | `queryKey` factories; `useMutation` for template writes |
| TanStack Table | 8.21.3 | Object browser table | Headless; server-side pagination mode |
| **React Router** | **7.13.2** | Routing + URL state | ⚠️ PRD omitted this; required for F-10 (bookmarkable filters) |
| Recharts | 3.8.0 | Charts | Use shadcn `Chart` wrapper for theme consistency |
| ansi-to-html | 0.7.2 | ANSI → HTML (Phase 3) | Viable for display-only; flag for Phase 3 review |
| react-diff-viewer-continued | 4.2.0 | JSON diff view (Phase 4) | Actively maintained fork |

#### Backend

| Library | Version | Role | Notes |
|---------|---------|------|-------|
| **Express** | **5.2.1** | HTTP server | ⚠️ PRD implied v4; v5 stable since Dec 2024; async middleware, ReDoS fix |
| simple-git | 3.33.0 | Git access | Args passed as arrays — no shell injection risk |
| **Zod** | **4.3.6** | Schema validation | ⚠️ PRD said "Zod" without version; v4 is the current npm default; 14x faster |
| tsx | 4.21.0 | TypeScript runner | No compile step; esbuild-powered |
| nodemon | 3.1.14 | Backend hot reload | Exclude `PrivilegedEAM/` + `Classification/` from watch |
| concurrently | 9.2.1 | Dev process manager | Runs Vite + Express in parallel |

#### Runtime

- **Node.js 22 LTS minimum** (v20 EOL March 2026; v24 recommended for new installs)
- No npm dependency for SSE streaming — use Express `res.write` + `text/event-stream` natively

#### Fluent Aesthetic via CSS Custom Properties

Do not install Fluent UI React v9. Instead, configure the Tailwind `@theme` block:

```css
@theme inline {
  --color-primary: #0078d4;             /* Fluent Blue 60 */
  --color-primary-hover: #106ebe;
  --color-background: #ffffff;
  --color-foreground: #201f1e;          /* neutralDark */
  --color-muted: #f3f2f1;              /* neutralLight */
  --color-muted-foreground: #605e5c;   /* neutralSecondary */
  --color-border: #edebe9;             /* neutralQuaternary */
  --color-destructive: #a4262c;        /* Fluent red */
  --radius: 0.125rem;                  /* 2px — Fluent-tight radii */
  --font-sans: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
}
```

---

### 2. Table Stakes Features (Must Ship in v1 — Phases 1–2)

Users are security administrators who compare this tool to Entra Admin Center, PIM, and Defender XDR. Missing any of these makes the tool feel incomplete or untrustworthy.

**Phase 1 (Dashboard + Object Browser):**

| Feature | Why Non-Negotiable |
|---------|-------------------|
| Tier KPI cards (ControlPlane / ManagementPlane / UserAccess counts) | Core value at a glance; first thing any privileged access admin looks for |
| Assignment type breakdown (Permanent vs Eligible per tier) | Permanent ControlPlane assignments are the primary red flag; must be visible immediately |
| RBAC system breakdown | Cross-system view is EntraOps's core value proposition; 5 systems visible at once |
| Object type breakdown (User / Group / Service Principal) | Non-human identity at ControlPlane is a critical security signal |
| Data freshness timestamp | Users cannot trust data of unknown age; every comparable tool shows this |
| Sortable, paginated object table | All PAM tools lead with a principal list; TanStack Table handles this |
| Multi-facet filter bar (tier, RBAC system, object type, PIM type) | Users arrive with a specific question; they need to filter to the answer in seconds |
| Free-text search (name / UPN / objectId) | Standard in all Azure admin tools; critical for finding a specific identity |
| Filter state in URL (bookmarkable) | Security teams share links; auditors want reproducible views |
| Object detail slide-out panel | Identity card + role assignments + AU memberships in one place |
| RoleDefinitionActions expandable in detail panel | Shows *why* an identity is ControlPlane — the specific permission strings |
| Tier color-coding throughout (red/amber/blue) | Users must never have to guess tier from a badge alone |
| Graceful empty states | Users who haven't run `Save-EntraOpsPrivilegedEAMJson` hit this first; must not crash |

**Phase 2 (Template Editor):**

| Feature | Why Non-Negotiable |
|---------|-------------------|
| Template structured view (tier > category > service hierarchy) | Users currently hand-edit JSON; a structured UI is the entire value of Phase 2 |
| Zod schema validation before save | Corrupted templates cause silent privilege misclassification — the worst failure mode |
| Diff preview before save | No one should write a file without knowing what changed |
| Global.json exclusion list editor | Break-glass accounts need a UI; hand-editing JSON is error-prone |
| Git warning on save | Template changes should be committed; warn before writing |

---

### 3. Differentiators

Features that set EntraOps GUI apart from Entra Admin Center, PIM, and Defender XDR. These are the reasons someone uses this tool instead of the built-in Microsoft tooling.

| Differentiator | Why It Matters |
|---------------|----------------|
| **Cross-system unified identity view** | PIM shows Entra roles only; Defender shows Defender only. EntraOps GUI is the only place all 5 RBAC systems appear together for one identity |
| **Transitive membership attribution** | Surface when an identity reaches a tier *via group membership* — the `TransitiveByObjectDisplayName` field is unique to EntraOps output |
| **RoleDefinitionActions transparency** | No commercial tool shows the raw permission strings that determine classification; turns this into an education tool |
| **Tier-aware charts** | Recharts bar/donut colored by EAM tier; concept that doesn't exist in any standard Entra tool |
| **Administrative Unit membership context** | Which tier AUs an identity belongs to, whether RMAU protection applies — invisible in all standard tools |
| **Template editor with diff** (Phase 2) | No other tool offers in-browser editing of `Classification/Templates/*.json` with schema validation and diff preview |
| **PowerShell command runner** (Phase 3) | Run classification updates in the browser; no terminal switch required |
| **Git-native EAM change history** (Phase 4) | "What changed between runs?" answered from local git — no Sentinel workspace required |
| **Object-level change summary** (Phase 4) | "3 new ControlPlane identities since last run" — no other tool produces this from local history |

---

### 4. Architecture Overview

The GUI lives in `gui/` inside the existing EntraOps repo. It uses a **three-zone layout** with strict coupling rules:

```
gui/
├── shared/types/     ← Zero Node.js imports. Both client + server import from here.
├── client/           ← Vite SPA. Imports from shared/. Never imports from server/.
└── server/           ← Express backend. Imports from shared/. Uses Node.js + fs.
```

**Runtime topology:**
- Dev: Vite (`:5173`) proxies `/api/*` → Express (`:3001`). No CORS needed in dev.
- Prod: Express serves `client/dist/` static files + catches all non-API routes with `index.html`.

**Key components:**

| Component | Responsibility |
|-----------|---------------|
| `EamFileService` | Reads `PrivilegedEAM/*.json` — async fs, BOM stripping, in-memory cache with mtime invalidation, pagination |
| `TemplateService` | Reads/writes `Classification/Templates/*.json` — Zod validation, atomic write (temp → rename), `passthrough()` for unknown fields |
| `GitService` | simple-git with full edge-case handling (empty repo, shallow clone, detached HEAD) |
| `RunnerService` | Phase 3 only — `spawn()` with array args, process lifecycle tracking, SSE stream |
| TanStack Query hooks | Data layer on the client; cache key factories; invalidation on write |
| React Router v7 | URL search params for filter state; per-object routes for deep linking |
| Zustand stores | Local UI state (panel open/closed, command runner status) that doesn't belong in URL |

**Data flow for large files:**
- Files <300MB: `fs.promises.readFile()` + `JSON.parse()` → in-memory cache (5-min TTL + mtime check)
- Files ≥300MB: `stream-json` streaming parser (opt-in, detected by file size on first load)
- Pagination is **server-side** — the browser never receives the full dataset. All filtering and slicing happens in Express before the JSON response is serialized.

**API design:** Plain REST with Zod-validated request bodies. No tRPC. Route structure: `/api/eam/*`, `/api/templates/*`, `/api/git/*`, `/api/run` (Phase 3).

---

### 5. Top Pitfalls (Ranked by Severity)

#### CRITICAL — SECURITY (must be in Phase 1 / Phase 3 baseline)

1. **Shell injection via PowerShell runner** — Never use `exec()` or string interpolation for PowerShell commands. Always `spawn('pwsh', ['-NonInteractive', '-NoProfile', allowlistedCmd, ...validatedArgs])` with exact-equality allowlist check. Validate every parameter value with a per-command Zod schema before passing to spawn. One `exec()` anywhere in the runner is an RCE vulnerability.

2. **Path traversal in file API endpoints** — `path.join()` does NOT prevent traversal — it resolves `../` cleanly. After resolving, every file-read and file-write endpoint must assert `resolved.startsWith(BASE + path.sep)`. Template write endpoints are highest risk. Apply the guard before every `fs` operation.

3. **Express binding to 0.0.0.0** — `app.listen(PORT)` binds to all interfaces on most systems. On a corporate laptop or home network, the API (including the Phase 3 command runner) becomes accessible to other machines. Always: `app.listen(PORT, '127.0.0.1', ...)`. Add a `Host` header validation middleware for DNS rebinding protection.

4. **Arbitrary file write without Zod validation** — The template editor write endpoint must call `Zod.parse()` before any `fs.writeFile()`. Use `.safeParse()` for loading but never write on a parse failure. Shared Zod schema (imported by both frontend form and backend route handler) is the single source of truth.

#### CRITICAL — ARCHITECTURE (must be in Phase 1 baseline)

5. **Blocking the event loop with synchronous JSON reads** — `fs.readFileSync()` + `JSON.parse()` on large EAM files blocks all Express requests for seconds. Use `fs.promises.readFile()` everywhere. Add the in-memory cache (mtime-invalidated) on the first data endpoint before any UI work — the dashboard depends on it.

#### MODERATE (address in the phase that introduces the feature)

6. **Orphaned PowerShell processes** (Phase 3) — SSE disconnect doesn't kill the child process. Attach `req.on('close')` to every SSE route. Track active processes in a module-level Map. Cleanup on Express `SIGTERM`.

7. **PowerShell executable path on Windows** (Phase 3) — Hardcoded `'pwsh'` fails on some Windows configs. Resolve path at startup; check `pwsh` → `pwsh.exe` → `powershell.exe`; cache result; never use `shell: true`.

8. **Windows BOM + backslash paths** (Phase 1) — `JSON.parse()` throws on UTF-8 BOM. Strip `\uFEFF` before parsing. Normalize paths to forward slashes before sending to frontend.

9. **Shared types bundle leakage** (Phase 1) — Any Node.js built-in import in `shared/` causes Vite build failures or leaks server code to the browser bundle. Enforce zero Node.js imports in `shared/` via ESLint or CI check.

10. **TanStack Table filter re-renders** (Phase 1) — Define column definitions outside the component (or `useMemo`). Debounce URL search param updates by 300ms. Separate local filter state from URL state for responsive keystroke UX. Use server-side filtering for tenants with >2,000 privileged objects.

11. **Zod schema vs. disk template drift** (Phase 2) — User-customized templates may have extra fields. Use `schema.passthrough()` when loading templates (preserve unknown fields). Only strict-validate the fields the GUI writes. Display a warning badge for unrecognized fields rather than blocking the editor.

12. **Git edge cases** (Phase 1 dashboard widget + Phase 4) — Wrap every `simple-git` call in try/catch. Check `.checkIsRepo()` before any operations. Handle: empty repo (no commits), detached HEAD (CI checkout), shallow clone (git log depth=1), uncommitted files (use `fs.stat()` mtime as authoritative freshness timestamp, not just git log).

#### MINOR

13. **PowerShell ANSI progress bars** (Phase 3) — `ansi-to-html` doesn't handle `Write-Progress` OSC sequences. Strip cursor-movement sequences (`/\x1b\[\d+[A-G]/g`) before rendering. Replace carriage returns without newlines (`\r` without `\n`) to prevent line overwrite in HTML.

14. **nodemon restarting during active command runs** (Phase 3 dev) — Configure nodemon to ignore `PrivilegedEAM/` and `Classification/` directories.

---

## Build Wave Structure

Recommended implementation order based on feature dependencies and architecture coupling:

### Wave 1 — Foundation Scaffold (Phase 1, Week 1)

**Rationale:** Everything depends on this. Cannot build dashboard or object browser without a working data pipeline with correct security baseline.

- `gui/` directory structure with `shared/`, `client/`, `server/` and strict import rules
- Express v5 with `127.0.0.1` binding, path-anchored file routes, `Host` header middleware
- `EamFileService`: async read, BOM strip, in-memory cache, server-side pagination
- Vite SPA scaffold with Tailwind v4 CSS, shadcn/ui init, Fluent `@theme` block
- React Router v7 route shell (Dashboard, Browser, Templates stub pages)
- TanStack Query client + typed API client (`gui/client/src/lib/`)
- `npm run dev` (concurrently) working end-to-end

**Pitfalls to address:** S2 (path traversal), S3 (0.0.0.0 binding), A1 (async JSON reads), D1 (proxy setup), D2 (shared types boundary), C2 (BOM stripping)

### Wave 2 — Dashboard Page (Phase 1, Week 1–2)

**Rationale:** Validates the entire data pipeline; delivers immediate value to first users.

- `/api/eam/summary` endpoint (tier counts, RBAC system counts, freshness timestamp)
- Tier KPI cards, assignment type breakdown chart, RBAC system chart
- Data freshness card + graceful empty state (no data → instructions to run EntraOps)
- Tier color-coding convention established (red/amber/blue) used everywhere downstream

**Stack hits:** Recharts, shadcn `Chart` wrapper, data freshness via `fs.stat()` mtime

### Wave 3 — Object Browser (Phase 1, Week 2–3)

**Rationale:** The highest-traffic page. Requires URL state to be correct before detail panel.

- `/api/eam/objects` endpoint with server-side filter + pagination
- TanStack Table with column definitions defined outside component (`useMemo`)
- Filter bar (tier, RBAC system, object type, PIM type, free-text) with 300ms debounce to URL
- `useSearchParams()` for bookmarkable filter state
- Object detail slide-out panel (identity card, role assignments, AU memberships)
- RoleDefinitionActions expand-in-place in detail panel
- Per-object URL route (`/object/:id`)

**Pitfalls to address:** D3 (filter re-renders + debounce), M2 (git edge cases for freshness widget)

### Wave 4 — Template Editor (Phase 2)

**Rationale:** High value, isolated from Phase 1. Depends on shared Zod schema pattern established in Wave 1.

- `/api/templates/:name` GET + PUT endpoints (allowlisted names, Zod validation, atomic write, `passthrough()` on load)
- Template structured tree view (tier > category > service hierarchy)
- RoleDefinitionActions add/remove in-place
- `react-diff-viewer-continued` diff preview dialog before save
- Global.json exclusion list editor
- Git warning modal on save

**Pitfalls to address:** S4 (file write without validation), S2 (template write path traversal), M1 (Zod schema drift)

### Wave 5 — PowerShell Command Runner (Phase 3)

**Rationale:** High friction removal for core workflow. Highest security risk concentration — do Phase 1 + 2 first to validate usage patterns.

- Exact-equality allowlist (single enum of permitted cmdlet names)
- Per-command Zod parameter validation before any spawn
- `child_process.spawn()` with array args, `'pwsh'` path resolved at startup
- SSE streaming endpoint (`text/event-stream`; `req.on('close')` cleanup; process kill map)
- ANSI rendering with progress-bar sequence stripping
- Stop button → `DELETE /api/run` → `SIGTERM` + 2s timeout → `SIGKILL`
- Session run history (last N runs this browser session, via Zustand)

**Pitfalls to address:** S1 (shell injection), A2 (orphaned processes), C1 (pwsh path), C3 (no shell:true), MIN1 (ANSI progress bars), MIN2 (nodemon exclusions)

### Wave 6 — Git Change History (Phase 4)

**Rationale:** Unlocks the audit use case; requires simple-git service with full edge-case hardening.

- `GitService` with `checkIsRepo()` guard, try/catch on all operations, empty-state handling
- `/api/git/commits` endpoint (scoped to `PrivilegedEAM/`, last 50 commits)
- Commit list UI with date, message, files-changed count
- Commit pair selector → `/api/git/diff` → semantic EAM change summary (added/removed/tier-changed)
- `react-diff-viewer-continued` for raw JSON diff of selected file
- "Compare any two runs" selector (not just adjacent commits)

**Pitfalls to address:** M2 (empty repo, shallow clone, detached HEAD, uncommitted files)

### Wave 7+ (Post-MVP)

- **Phase 5:** Settings page (`EntraOpsConfig.json` structured editor)
- **Phase 6+:** Attack path graph (Cytoscape.js; requires `Get-EntraOpsWorkloadIdentityAttackPaths` data)
- **Phase 7+:** AI/Copilot integration (explain classifications; natural language filter; local Ollama option)
- **Alerting:** Dashboard badge for new ControlPlane identities before full push notification support

---

## Key Decisions Made by Research

These are settled. Planners and implementation phases should not re-litigate them.

| Decision | Verdict | Rationale |
|----------|---------|-----------|
| **Tailwind v4, not v3** | CONFIRMED | CSS-first `@theme` config; 3.5x faster builds; no `tailwind.config.js`; required for Vite 8 plugin |
| **shadcn/ui, not Fluent UI v9** | CONFIRMED | Griffel (Fluent's CSS-in-JS) conflicts with Tailwind; shadcn/ui owns the space; Fluent aesthetic achieved via CSS variables |
| **React Router v7 (add to PRD stack)** | REQUIRED | PRD omission; F-10 (URL filter state) cannot be implemented without a router with `useSearchParams()` |
| **Express v5, not v4** | CONFIRMED | Stable since Sept 2024; async middleware eliminates try/catch boilerplate; ReDoS fix in path-to-regexp v8 |
| **Zod v4, not v3** | CONFIRMED | 14x faster string parsing; is now the npm default; `passthrough()` semantic critical for template loading |
| **Node.js 22 minimum** | CONFIRMED | v20 EOL is March 2026; v22 receives security fixes through April 2027 |
| **SSE, not WebSocket** | CONFIRMED | PowerShell streaming is unidirectional; SSE needs no library; EventSource is native browser API |
| **Server-side pagination** | CONFIRMED | Large tenant files can be 10MB–500MB; browser must never receive the full dataset |
| **Express binds to `127.0.0.1`** | SECURITY BASELINE | Must not bind to `0.0.0.0`; local tool with no auth on a corporate network is a critical exposure |
| **Shared types: zero Node.js imports** | ARCHITECTURE BASELINE | Prevents server code leaking into Vite bundle; enforced by ESLint/CI |
| **No auth, no login screen** | CONFIRMED (anti-feature) | Local single-user tool; filesystem is the security boundary; auth adds complexity with no security benefit |
| **No Graph API calls** | CONFIRMED (anti-feature) | Defeats the "local file reader" value prop; users who just forked the repo can't see anything if Graph auth is required |
| **No dark mode in v1** | CONFIRMED (anti-feature) | CSS variables are already correct for future dark mode; don't add complexity to Phase 1 |
| **No PDF/CSV export in v1** | CONFIRMED (anti-feature) | Medium complexity; blocks Phase 1 velocity; JSON via API endpoint is sufficient |
| **Desktop-first, 1280px minimum** | CONFIRMED (anti-feature) | Security dashboards are desktop workflows; responsive CSS adds complexity with zero user value |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Technology versions | HIGH | Verified against live npm registry March 2026 |
| Security baseline (S1–S4) | HIGH | OWASP A01/A03 patterns; identical concerns in any local tool with file write + process spawn |
| Architecture patterns | HIGH | Standard for VS Code webviews, Nx Console, similar local developer tools |
| Feature prioritization | HIGH | Domain-specific analysis of Microsoft Entra PIM + Defender XDR as reference tools |
| Large file handling thresholds | MEDIUM | 300MB threshold is a reasonable heuristic; real tenant sizes vary widely |
| Phase 3 ANSI rendering edge cases | MEDIUM | PowerShell ANSI output is complex; real-world testing required; may need `@xterm/xterm` upgrade |
| Phase 5+ attack path graph | MEDIUM | Cytoscape.js recommendation is well-founded; data model for EntraOps paths needs design work |

**Gaps requiring later attention:**
- Actual size distribution of `PrivilegedEAM/` files in real tenants (determines whether streaming fallback is necessary in Phase 1 or a later hardening step)
- Windows-specific testing for BOM stripping and PowerShell path resolution (development on macOS may mask issues)
- Phase 3 ANSI sequence coverage — test with `Write-Progress`, `Write-Host`, colored output, and hyperlinks before shipping

---

## Sources

| Source | Confidence |
|--------|-----------|
| npm registry (live, March 2026) | HIGH |
| react.dev/blog (React 19.2, Oct 2025) | HIGH |
| tailwindcss.com/blog/tailwindcss-v4 | HIGH |
| ui.shadcn.com/docs/tailwind-v4 | HIGH |
| github.com/expressjs/express/releases (v5.2.1) | HIGH |
| nodejs.org/en/about/previous-releases (v20 EOL) | HIGH |
| zod.dev/v4 | HIGH |
| Microsoft Entra PIM docs (verified March 2026) | HIGH |
| Microsoft Defender XDR Identity docs (verified March 2026) | HIGH |
| Microsoft Security Exposure Management — Attack paths (verified March 2026) | HIGH |
| OWASP Top 10 2021 | HIGH |
| Node.js child_process docs | HIGH |
| AzurePrivilegedIAM GitHub (EntraOps classification source) | HIGH |
| EntraOps GUI PRD (`GUI-PRD.md` v0.1 draft) | HIGH |
| EntraOps codebase analysis (`.planning/codebase/`) | HIGH |
