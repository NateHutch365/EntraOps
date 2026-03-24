# Technology Stack — EntraOps GUI

**Project:** EntraOps GUI (local-first React security dashboard)
**Researched:** 24 March 2026
**Confidence:** HIGH (verified against live npm registry, official docs, GitHub releases)

---

## Quick Reference: All Libraries

| Library | Version | Confidence | PRD alignment |
|---------|---------|-----------|--------------|
| React | 19.2 | HIGH | ✅ Confirmed |
| TypeScript | 5.8+ | HIGH | ✅ Confirmed |
| Vite | 8.0.2 | HIGH | ✅ Confirmed |
| Tailwind CSS | **4.2.2** | HIGH | ⚠️ PRD assumes v3; use v4 |
| shadcn/ui | CLI v4 (March 2026) | HIGH | ✅ Best choice for Microsoft aesthetic |
| Lucide React | 1.6.0 | HIGH | ➕ Add (icons for shadcn/ui) |
| Sonner | 2.0.7 | HIGH | ➕ Add (replacing old toast) |
| TanStack Query | 5.95.2 | HIGH | ✅ Confirmed |
| TanStack Table | 8.21.3 | HIGH | ✅ Confirmed |
| React Router | 7.13.2 | HIGH | ➕ Add — URL filter state (F-10) not addressed in PRD |
| Recharts | 3.8.0 | HIGH | ✅ Confirmed |
| ansi-to-html | 0.7.2 | MEDIUM | ✅ Confirmed (flag: low upstream activity) |
| react-diff-viewer-continued | 4.2.0 | HIGH | ✅ Confirmed |
| Express | **5.2.1** | HIGH | ⚠️ PRD implies v4; use v5 (stable since Sept 2024) |
| simple-git | 3.33.0 | HIGH | ✅ Confirmed |
| Zod | **4.3.6** | HIGH | ⚠️ PRD says "Zod" — v4 is now stable, use it |
| tsx | 4.21.0 | HIGH | ✅ Confirmed |
| nodemon | 3.1.14 | HIGH | ✅ Confirmed |
| concurrently | 9.2.1 | HIGH | ✅ Confirmed |
| Node.js | **22 LTS** (min) | HIGH | ⚠️ PRD says 20+; v20 ends March 2026 |

---

## Frontend

### Core Framework

**React 19.2 + TypeScript 5.8 + Vite 8**

React 19.2 (released October 2025) is the stable version to use. It ships with Actions, the `use()` hook, `useOptimistic`, improved Suspense, and the stable React Compiler v1.0. For a Vite SPA, React 19 is the straightforward choice. React 18 should not be used for new projects.

Vite 8.0.2 is the current version. The PRD does not pin a version, and any recent Vite will work. Use Vite 8.

```bash
npm create vite@latest gui -- --template react-ts
```

> **PRD verdict:** React + TypeScript + Vite — CONFIRMED. No version changes required, just ensure you bootstrap with current templates.

---

### Styling: Tailwind CSS v4 (not v3)

**IMPORTANT: The PRD assumes Tailwind v3. Use Tailwind v4 (4.2.2).**

Tailwind v4 (released January 2025, current 4.2.2) is a ground-up rewrite. Key differences that affect this project:

- **Vite plugin available** (`@tailwindcss/vite`) — zero-config, integrates directly with Vite 8
- **No `tailwind.config.js`** — configuration lives in CSS via `@theme {}` directive
- **CSS-first theming** — design tokens become CSS custom properties automatically (critical for Fluent color integration)
- **Automatic content detection** — no `content` array to configure
- **3.5x faster builds**, incremental rebuilds over 100x faster

Installation for Vite:
```bash
npm install tailwindcss @tailwindcss/vite
```

vite.config.ts:
```ts
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ plugins: [tailwindcss()] });
```

CSS (globals.css):
```css
@import "tailwindcss";
@import "tw-animate-css";   /* replaces tailwindcss-animate */

@theme inline {
  --color-primary: #0078d4;        /* Fluent Blue 60 */
  --color-primary-hover: #106ebe; /* Fluent Blue 70 */
  --radius-sm: 2px;                /* Fluent uses tight radii */
  --font-sans: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
}
```

> **PRD verdict:** UPGRADE from v3 assumption to v4. CSS-first configuration is the right approach here, especially since it will make Fluent color theming straightforward via CSS variables.

---

### UI Component Library: shadcn/ui — DEFINITIVE CHOICE

**Recommendation: shadcn/ui with Fluent-inspired custom theme. Do NOT use Fluent UI React v9.**

#### Why not Fluent UI React v9 (`@fluentui/react-components`)?

Fluent UI v9 uses **Griffel** (Microsoft's CSS-in-JS library). Griffel fundamentally conflicts with Tailwind's utility-first approach — they produce competing style systems that override each other in unpredictable ways. Fluent UI v9 is designed to be a self-contained design system, not a CSS-flexible component library. Bundle size with Griffel is significant.

For an existing Microsoft-aesthetic look, Fluent UI is the instinct — but it is the wrong tool when Tailwind is already the styling strategy.

#### Why shadcn/ui?

- **111K GitHub stars** (March 2026), most active React component ecosystem
- Components are **copied into the codebase** — not a dependency. You own the code. Zero lock-in.
- **Full Tailwind v4 + React 19 support** (official, CLI v4 released March 2026)
- **Radix UI or Base UI primitives** — keyboard accessible, ARIA-correct out of the box
- **CSS variables for theming** — maps cleanly to Fluent Design tokens (blue-60, gray tones, 2px radii)
- **Vite template available**: `npx shadcn@latest init` selects Vite as a target
- Ships a Dashboard block, Sidebar block, Table, Tabs, Dialogs, Forms — covers every surface in the PRD

#### Achieving the Microsoft/Fluent aesthetic with shadcn/ui

The Fluent Design aesthetic is defined by:

1. **Color**: Fluent Blue (`#0078D4`) as primary, neutral grays for surfaces
2. **Radius**: Very tight (2–4px), not the large rounded corners typical of consumer apps
3. **Typography**: Segoe UI Variable (falls back to system-ui on non-Windows)
4. **Surface**: Layered whites and light grays (`#F3F2F1`, `#EDEBE9`, `#E1DFDD`)
5. **Icons**: Fluent icons are distinctive but Lucide React (available separately) works well

All five can be expressed via the Tailwind v4 `@theme {}` block and shadcn/ui CSS variables without touching component code.

```css
@theme inline {
  --color-background: #ffffff;
  --color-foreground: #201f1e;          /* Fluent: neutralDark */
  --color-primary: #0078d4;            /* Fluent: themePrimary */
  --color-primary-foreground: #ffffff;
  --color-muted: #f3f2f1;              /* Fluent: neutralLight */
  --color-muted-foreground: #605e5c;   /* Fluent: neutralSecondary */
  --color-border: #edebe9;             /* Fluent: neutralQuaternary */
  --color-destructive: #a4262c;        /* Fluent: red */
  --radius: 0.125rem;                  /* 2px — Fluent-tight */
  --font-sans: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
}
```

For icons, use `@fluentui/react-icons` selectively (tree-shakable) for authentic Microsoft icons where they matter (tier classification badges, identity type icons), and Lucide React everywhere else.

```bash
npm install lucide-react
npm install @fluentui/react-icons  # optional, for authentic Fluent icons
```

> **PRD verdict:** shadcn/ui is the RIGHT choice. Fluent UI v9 would be a mistake with Tailwind. CONFIRMED with specific theming approach.

---

### Data Fetching: TanStack Query v5 — CONFIRMED

TanStack Query v5.95.2 is the current stable release. The PRD's choice is correct.

Key v5 patterns for this project:
- Use `queryKey` factories to invalidate cache after PowerShell runs
- Use `useMutation` for template file writes (triggers cache invalidation)
- SSE streams (PowerShell runner) bypass TanStack Query — use `useRef` + `useState` directly
- Use `staleTime: Infinity` for file reads (files don't change unless EntraOps runs)

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

> **PRD verdict:** CONFIRMED. v5 is correct and current.

---

### Routing: React Router v7 — ADD (PRD OMISSION)

**The PRD does not specify a router. This is a gap — F-10 requires URL-reflected filter state.**

React Router v7.13.2 is the current stable release. For a Vite SPA, use it in **declarative mode** (not framework mode — this is not Remix).

Why React Router v7 over TanStack Router:
- URL search params via `useSearchParams()` is all that's needed for filter state
- Simpler API for a 5-page SPA with shallow routing requirements
- TanStack Router v1 is excellent but adds TypeScript generics complexity for marginal benefit here

Why React Router v7 over Wouter:
- Wouter lacks `useSearchParams()` — would need manual URL parsing for F-10

```bash
npm install react-router
```

Usage for bookmarkable filter state (F-10):
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const tier = searchParams.getAll("tier");  // multi-select preserved in URL
```

> **PRD verdict:** ADD to stack. This is a required dependency that the PRD overlooked.

---

### Table: TanStack Table v8 — CONFIRMED

TanStack Table v8.21.3 is the current stable release. Headless approach is correct for a Tailwind + shadcn/ui project — shadows existing component styles, so you get full visual control.

Use the shadcn/ui `DataTable` pattern (copy in, own the code) as the base.

```bash
npm install @tanstack/react-table
```

> **PRD verdict:** CONFIRMED. Current and correct.

---

### Charts: Recharts v3 — CONFIRMED

Recharts v3.8.0 is the current stable release. The PRD's choice is correct.

Recharts v3 includes React 19 compatibility and improved TypeScript types. For this project's tier breakdown charts (F-01 to F-04), `BarChart`, `PieChart`, and `ResponsiveContainer` cover all requirements.

Note: shadcn/ui ships a `Chart` component that wraps Recharts. Use it for consistent theming.

```bash
npm install recharts
```

> **PRD verdict:** CONFIRMED. v3 is current.

---

### Terminal Output: ansi-to-html — CONDITIONALLY CONFIRMED

`ansi-to-html` v0.7.2 is viable but worth understanding the tradeoff:

**Use ansi-to-html if:** You want minimal bundle size and a pure HTML rendering approach. PowerShell ANSI codes (Write-Host colors, standard 16-color SGR sequences) are well-handled.

**Use `@xterm/xterm` (v6.0.0) if:** You need scrollback history, cursor positioning emulation, wide character (CJK) support, or interactive input.

For this project (F-23, F-24): the terminal is **display-only** — streaming output from running cmdlets. Interactive input is not needed (command parameters are handled via form UI). `ansi-to-html` is sufficient.

**Concern**: Last commit to `ansi-to-html` was 4 years ago. The library is stable but may eventually need replacing if PowerShell introduces new ANSI sequences it doesn't handle. Keep this in mind for Phase 3.

Alternative: `anser` (npm: `anser`) — similar API, more recently maintained, handles edge cases around hyperlinks in terminal output.

```bash
npm install ansi-to-html          # PRD choice — viable
# OR:
npm install anser                 # alternative if ansi-to-html causes issues
```

> **PRD verdict:** CONDITIONALLY CONFIRMED. Appropriate for Phase 3 MVP. Flag for replacement if ANSI edge cases hit.

---

### Git Diff View: react-diff-viewer-continued — CONFIRMED

`react-diff-viewer-continued` v4.2.0 is the current stable. This is the actively maintained fork of the original `react-diff-viewer`. The PRD's choice is correct.

For F-30 (file diff for EAM JSON), the side-by-side view is appropriate. Configure with `splitView={true}` and dark theme to match the security tool aesthetic.

```bash
npm install react-diff-viewer-continued
```

> **PRD verdict:** CONFIRMED.

---

## Backend

### HTTP Server: Express v5 — UPGRADE FROM PRD ASSUMPTION

**IMPORTANT: Express v5 is now the stable release. Do not use Express v4.**

Express v5.2.1 was released December 2025. Major improvements relevant to this project:

- **Async middleware support** — rejected promises are automatically passed to error handlers as errors. This eliminates try/catch boilerplate in every route.
- **Better security via path-to-regexp v8** — ReDoS mitigation
- **Brotli encoding support** built-in
- Node.js 18+ required (v22 is used in this project)

Express v5 is a lightweight migration from v4. Key changes:
- Wildcard routes: `/*` → `/*splat` or `/{*splat}`
- `res.status(xxx).json()` — status must chain before send
- `req.query` is read-only (getter)

```bash
npm install express@^5
npm install -D @types/express
```

> **PRD verdict:** UPGRADE to v5. The PRD says "Express.js" without a version; v5 is the correct choice for any new project in 2026.

---

### TypeScript Runner: tsx — CONFIRMED

`tsx` v4.21.0. The PRD's choice for running TypeScript backend directly with Node.js is correct. `tsx` uses esbuild under the hood for fast transpilation with no compilation step.

```bash
npm install -D tsx
```

> **PRD verdict:** CONFIRMED.

---

### Schema Validation: Zod v4 — UPGRADE FROM PRD ASSUMPTION

**Use Zod v4.3.6, not v3. This is a major performance leap.**

Zod v4 (stable, released 2025) is dramatically faster:
- 14x faster string parsing
- 7x faster array parsing
- 6.5x faster object parsing
- 100x fewer TypeScript type instantiations (huge for complex schemas like EAM JSON)
- 57% smaller core bundle

Migration from v3 to v4 is minimal for this project's use case (validating JSON file writes). The `error` parameter replaces `message`/`invalid_type_error`/`required_error`, but most `z.object()` / `z.string()` / `z.array()` usage is identical.

New in v4 relevant to this project:
- `z.toJSONSchema()` — converts Zod schemas to JSON Schema (useful for OpenAPI-style docs on the Express API)
- Native recursive object support (no type casting for nested EAM structures)
- `z.prettifyError()` — cleaner error messages for validation failures shown in the UI

```bash
npm install zod@^4
```

> **PRD verdict:** UPGRADE to v4. v4 is currently published as the default `npm install zod`. The PRD's intent is satisfied by v4.

---

### Git Access: simple-git — CONFIRMED

`simple-git` v3.33.0. The PRD's security rationale is correct: passing git arguments as arrays (not shell strings) prevents shell injection. This is the right approach for F-29 through F-32 (change history).

```bash
npm install simple-git
```

> **PRD verdict:** CONFIRMED. Critical security choice — do not use `child_process.exec('git ...')`.

---

### PowerShell Streaming: SSE (Server-Sent Events)

**PRD does not specify a streaming mechanism. Use Server-Sent Events — not WebSockets.**

For F-23 (real-time command output streaming), SSE is the correct choice:

- **Unidirectional** — PowerShell → backend → browser. No bidirectional communication is needed. SSE is exactly this pattern.
- **No library required** — Express v5 with `res.writeHead` + `res.write` + `text/event-stream` content type
- **Native browser API** — `EventSource` on the client, no client library
- **Lighter than WebSocket** — no connection upgrade, no ping/pong overhead
- **HTTP/1.1 compatible** — works on any connection

Backend pattern:
```ts
app.get('/api/commands/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Spawn allowlisted PowerShell command
  const proc = spawn('pwsh', ['-Command', allowlistedCommand]);

  proc.stdout.on('data', (chunk) => {
    res.write(`data: ${JSON.stringify({ type: 'stdout', text: chunk.toString() })}\n\n`);
  });

  proc.stderr.on('data', (chunk) => {
    res.write(`data: ${JSON.stringify({ type: 'stderr', text: chunk.toString() })}\n\n`);
  });

  proc.on('close', (code) => {
    res.write(`data: ${JSON.stringify({ type: 'exit', code })}\n\n`);
    res.end();
  });

  // Kill process when client disconnects
  req.on('close', () => proc.kill('SIGTERM'));
});
```

Kill endpoint (F-27 — Stop button):
```ts
app.delete('/api/commands/current', (req, res) => {
  // kill the tracked process
  res.status(204).end();
});
```

> **PRD verdict:** ADD SSE pattern. This is the mechanism that makes F-23/F-24 work. No npm dependency needed.

---

### File System API: Express Routes with Path Anchoring

**Security-critical pattern for F-17/F-18 (template writes) and F-34/F-35 (config writes).**

All file read/write routes must anchor paths to the repo root to prevent path traversal attacks (OWASP A01: Broken Access Control):

```ts
import path from 'node:path';
import fs from 'node:fs/promises';

const REPO_ROOT = path.resolve(__dirname, '../../');  // gui/ → repo root

app.put('/api/templates/:name', async (req, res) => {
  // Validate filename against allowlist — never use user input as filename directly
  const ALLOWED_TEMPLATES = ['AadResources', 'AppRoles', 'Defender', 'DeviceManagement', 'IdentityGovernance'];
  const { name } = req.params;
  if (!ALLOWED_TEMPLATES.includes(name)) {
    return res.status(400).json({ error: 'Invalid template name' });
  }

  // Anchor path
  const filePath = path.join(REPO_ROOT, 'Classification', 'Templates', `${name}.json`);

  // Validate with Zod v4 before write
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ errors: parsed.error.issues });
  }

  await fs.writeFile(filePath, JSON.stringify(parsed.data, null, 2), 'utf8');
  res.status(204).end();
});
```

Key patterns:
- **Use `node:fs/promises`** (native, no library needed)
- **Always anchor with `path.resolve`** from a known safe root
- **Validate against Zod schema** before any write
- **Allowlist file names** — never construct paths from raw user input

> **PRD verdict:** Pattern defined. Use `node:fs/promises` (built-in), not a filesystem abstraction library.

---

## Development Tooling

### Process Management: concurrently + nodemon — CONFIRMED

Both confirmed current:
- `concurrently` v9.2.1 — runs Vite dev server and Express backend simultaneously
- `nodemon` v3.1.14 — restarts backend on TypeScript file changes

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"nodemon --exec tsx server/index.ts\"",
    "build": "vite build && tsc -p server/tsconfig.json"
  }
}
```

> **PRD verdict:** CONFIRMED.

---

## Node.js Runtime

### Node.js 22 minimum (was 20+ in PRD)

**IMPORTANT: Node.js 20 "Iron" enters End-of-Life in March 2026 — the same month as this document.**

| Version | Status | End of Life |
|---------|--------|------------|
| v20 "Iron" | Maintenance LTS | **March 2026** — EOL now |
| v22 "Jod" | Maintenance LTS | April 2027 |
| **v24 "Krypton"** | **Active LTS** | April 2028 |

**Minimum: Node.js 22** (still receiving security fixes through April 2027)  
**Recommended: Node.js 24** (Active LTS, best choice for new development)

Express v5 requires Node.js 18+, so 22/24 are within spec.

Update `.nvmrc` and `package.json`'s `engines` field:
```json
{
  "engines": { "node": ">=22.0.0" }
}
```

Node.js 22+ features to leverage in this project:
- `node:fs/promises` (stable, no polyfill needed)
- `AbortSignal.timeout()` for process execution timeouts
- Native `fetch()` (if backend needs to validate anything via HTTP)
- Built-in URL pattern matching

> **PRD verdict:** UPDATE. "Node.js 20+" is no longer current — Node.js 20 EOL is March 2026. Use 22+ minimum.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| UI Components | **shadcn/ui** | Fluent UI v9 | Griffel CSS-in-JS conflicts with Tailwind |
| UI Components | shadcn/ui | Radix UI directly | shadcn/ui is Radix with styles — why do more work |
| UI Components | shadcn/ui | Headless UI | Fewer components, Tailwind Labs maintained (favors Next.js) |
| Streaming | **SSE** | WebSocket | No bidirectional need; SSE is simpler, fewer moving parts |
| Streaming | SSE | socket.io | overkill, extra dependency, abstracts away HTTP |
| Router | **React Router v7** | TanStack Router v1 | Equal capability; React Router simpler for this scope |
| ANSI rendering | **ansi-to-html** | @xterm/xterm | xterm is a full terminal emulator; overkill for display-only |
| Validation | **Zod v4** | Zod v3 | v4 is 14x faster, stable, current npm default |
| Build | **Vite 8** | webpack | Vite is faster; webpack is legacy for new React SPAs |

---

## Installation Reference

### Frontend (gui/client/)
```bash
npm install react react-dom react-router @tanstack/react-query @tanstack/react-table recharts ansi-to-html react-diff-viewer-continued lucide-react sonner

npm install -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite tw-animate-css @tanstack/react-query-devtools
```

Then initialise shadcn/ui:
```bash
npx shadcn@latest init --base radix
# Select: Vite, New York style, custom Fluent color theme
```

### Backend (gui/server/)
```bash
npm install express simple-git zod

npm install -D typescript tsx nodemon @types/express @types/node
```

### Root
```bash
npm install -D concurrently
```

---

## Sources

| Claim | Source | Confidence |
|-------|--------|-----------|
| React 19.2 stable | [react.dev/blog](https://react.dev/blog) (Oct 2025) | HIGH |
| Tailwind v4.2.2 | [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) | HIGH |
| shadcn/ui Tailwind v4 support | [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) | HIGH |
| Express v5.2.1 stable | [github.com/expressjs/express/releases](https://github.com/expressjs/express/releases) | HIGH |
| Node.js 20 EOL March 2026 | [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) | HIGH |
| Zod v4 stable | [zod.dev/v4](https://zod.dev/v4) | HIGH |
| Fluent UI v9 uses Griffel | [github.com/microsoft/fluentui](https://github.com/microsoft/fluentui/blob/master/README.md) | HIGH |
| All npm versions | Live npm registry (March 2026) | HIGH |

---

## Open Questions for Phase Planning

1. **`@fluentui/react-icons`** — worth adding for tier badge icons (ControlPlane, ManagementPlane, UserAccess) where the Fluent icon set is specifically recognisable to Azure users? Or stick with Lucide?
2. **`ansi-to-html` edge cases** — need to test with actual `Save-EntraOpsPrivilegedEAMJson` output before Phase 3 is considered done. Unknown whether custom PowerShell progress bars (Write-Progress) produce sequences that ansi-to-html handles correctly.
3. **SSE + React state architecture** — Phase 3 will need to decide whether terminal output is stored in component state (lost on navigation) or in a global store (preserved). TanStack Query cannot cache SSE. Flag for design in Phase 3 planning.
4. **Vite 8 breaking changes** — check if any Vite 8 → vite.config.ts API changes affect the `@tailwindcss/vite` plugin version. Both are moving fast.
