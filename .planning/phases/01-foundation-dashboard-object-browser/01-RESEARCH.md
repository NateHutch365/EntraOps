# Phase 1: Foundation, Dashboard & Object Browser — Research

**Researched:** 2026-03-24
**Domain:** Vite + React + Express + Tailwind v4 + shadcn/ui local-first security dashboard
**Confidence:** HIGH

---

## Summary

This phase builds a full-stack local development tool: a Vite/React SPA proxied to an Express v5 backend that reads local JSON files from `PrivilegedEAM/`. The stack is well-defined in STATE.md and every locked decision has a current-version verification below.

The key architectural tension is **server-side pagination vs. client-side**: STATE.md mandates server-side (Express slices the data, browser never receives the full dataset). This means the React component must drive all filtering/sorting/paging via URL parameters and fetch from Express on every state change. nuqs manages the URL state; TanStack Table renders in full-manual mode.

The biggest traps are Tailwind v4's CSS-first config (nothing looks like v3 tutorials), Express v5's changed wildcard syntax (SPA fallback will silently fail), and Windows BOM stripping (PowerShell writes UTF-8 BOM by default).

**Primary recommendation:** Scaffold with `shadcn@latest init -t vite`, accept the generated CSS skeleton, then layer Express v5 alongside it with 127.0.0.1 binding from day one.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | `gui/` scaffold with `client/`, `server/`, `shared/` layout; `npm install` installs all deps | Vite + React scaffold; monorepo workspace pattern in package.json |
| FOUND-02 | `npm run dev` starts both Vite dev server and Express backend concurrently | `concurrently` in root package.json scripts |
| FOUND-03 | Tailwind v4, shadcn/ui, Microsoft Fluent colour tokens, Segoe UI Variable font | CSS-first `@import` / `@theme inline` config; Fluent tokens as CSS custom props in `:root` |
| FOUND-04 | Express binds to 127.0.0.1; helmet; path traversal guards | `app.listen(PORT, '127.0.0.1')`; helmet middleware; `path.resolve()` + startsWith guard |
| FOUND-05 | React Router v7 app shell with persistent sidebar | `<BrowserRouter>` + `<Routes>` + `<Route>`; persistent layout via outlet |
| FOUND-06 | Vite proxies to Express in dev; build output served from Express in prod | `server.proxy` in vite.config.ts; `express.static` for client build |
| FOUND-07 | Shared TypeScript types in `gui/shared/types/` | Relative imports from both client and server; no workspace package needed |
| FOUND-08 | Cross-platform: path separators, BOM, PowerShell exe name | `\uFEFF` stripping; `path.resolve()` normalization; `process.platform` guards |
| DASH-01 | KPI counts by EAM tier from real `PrivilegedEAM/` JSON | Express aggregation route + in-memory cache |
| DASH-02 | Object type breakdown per tier | Count by `ObjectType` grouping in Express route |
| DASH-03 | RBAC system breakdown per tier | Count by `RoleSystem` × `ObjectAdminTierLevelName` grouping |
| DASH-04 | PIM assignment type chart — Permanent vs Eligible per tier | Count by `PIMAssignmentType` grouping across all role assignments |
| DASH-05 | Recent changes widget — last 5 git commits touching `PrivilegedEAM/` | `simple-git` log filtered to `PrivilegedEAM/` path |
| DASH-06 | Data freshness — timestamp of most recently written `PrivilegedEAM/` file | `fs.stat().mtime` across all files; return max |
| DASH-07 | Empty state when no `PrivilegedEAM/` data exists | API returns `{ hasData: false }`; React renders `<EmptyState>` |
| OBJ-01 | Sortable, paginated table of all privileged objects | TanStack Table `manualPagination + manualSorting`; Express slices data |
| OBJ-02 | Multi-select filters: tier, RBAC system, object type, PIM type, on-prem sync | nuqs `parseAsNativeArrayOf(parseAsString)` per filter; Express WHERE-style filtering |
| OBJ-03 | Free-text search by display name / UPN | nuqs `parseAsString`; Express `includes()` filter |
| OBJ-04 | Filter/search state reflected in URL — bookmarkable | nuqs manages all state as query params |
| OBJ-05 | Detail panel: identity card, role assignments, AU memberships, RMAU status | shadcn/ui `<Sheet>` slide-out; expandable sections with `<Collapsible>` |
| OBJ-06 | Role assignments expandable to show `RoleDefinitionActions` | `<Collapsible>` component per role assignment row |
| OBJ-07 | Full-page detail view via stable URL | React Router `<Route path="/objects/:objectId">` + same data from Express cache |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| vite | 8.0.2 | Build tool + dev server | Fastest HMR; first-class Tailwind v4 plugin |
| @vitejs/plugin-react | 6.0.1 | JSX transform + Fast Refresh | Official React plugin |
| @tailwindcss/vite | 4.2.2 | Tailwind v4 Vite plugin | Replaces PostCSS setup entirely |
| tailwindcss | 4.2.2 | CSS framework | Locked decision: v4 CSS-first |
| tw-animate-css | latest | CSS animations (replaces tailwindcss-animate) | Tailwind v4 deprecated tailwindcss-animate |
| react | 19.x | UI library | Required by shadcn/ui Tailwind v4 components |
| react-dom | 19.x | DOM renderer | |
| react-router | 7.13.2 | Client-side routing + URL state | Locked decision; needed for OBJ-04 |
| nuqs | 2.8.9 | URL search param state manager | Type-safe multi-value filter state in URL |
| express | 5.2.1 | Backend HTTP server | Locked decision; async errors native |
| helmet | 8.1.0 | HTTP security headers | OWASP requirement |
| typescript | 6.0.2 | Static typing | Current release; shared between client and server |
| tsx | 4.21.0 | TypeScript execution (dev server) | Fastest TS Node runner for v6 |
| concurrently | 9.2.1 | Run client + server together | Simple `npm run dev` |
| @tanstack/react-table | 8.21.3 | Headless data table | Manual server-side pagination/sorting/filtering |
| recharts | 3.8.0 | Charts (wrapped by shadcn/ui Chart) | shadcn/ui canonical chart library |
| simple-git | 3.33.0 | Git log for recent commits widget | Pure JS, cross-platform, no shell spawning |
| stream-json | 2.0.0 | Large JSON file streaming | Large tenant files (≥50 MB) |
| zod | 4.3.6 | Schema validation + type inference | Locked decision; validates query params server-side |
| sonner | 2.0.7 | Toast notifications | shadcn/ui deprecated toast in favour of sonner |
| lucide-react | 1.6.0 | Icon library | shadcn/ui default icons |
| clsx | 2.1.1 | Conditional class names | shadcn/ui utility |
| tailwind-merge | 3.5.0 | Merge conflicting Tailwind classes | shadcn/ui utility |
| class-variance-authority | 0.7.1 | Component variant system | shadcn/ui utility |
| vitest | 4.1.1 | Test framework | Vite-native; same config as dev |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.95.2 | Server state / data fetching | If caching + background refresh needed beyond simple fetch |
| @tanstack/react-virtual | 3.13.23 | Row virtualization | Object browser if row count exceeds ~5,000 |
| cmdk | 1.1.1 | Command palette | shadcn/ui Combobox/Command component (multi-select filter popover) |
| @radix-ui/react-slot | 1.2.4 | Polymorphic component slot | Used by shadcn/ui Button, etc. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nuqs | React Router `useSearchParams` directly | useSearchParams requires manual serialization/deserialization; nuqs gives typed parsers, array handling, and batch updates |
| simple-git | `child_process.exec('git log')` | child_process is brittle cross-platform (PowerShell quoting); simple-git is pure JS API |
| stream-json | Line-by-line `readline` | stream-json parses standard JSON; readline approach requires NDJSON format |
| TanStack Table (manual) | AG Grid Community | AG Grid Community free tier lacks some features; TanStack Table is headless and integrates cleanly with shadcn/ui styling |

### Installation
```bash
# Root
npm init -w gui -w gui/client -w gui/server
# or create package.json files manually, then:

# Client (from gui/client/)
npm install react react-dom react-router nuqs @tanstack/react-table recharts lucide-react clsx tailwind-merge class-variance-authority sonner
npm install -D vite @vitejs/plugin-react @tailwindcss/vite tailwindcss tw-animate-css typescript vitest @testing-library/react @testing-library/user-event @vitest/ui

# Server (from gui/server/)
npm install express helmet simple-git stream-json zod
npm install -D @types/express tsx typescript

# Shared types — no package needed; relative imports only
```

**Version verification (2026-03-24 via `npm view <pkg> version`):**
- vite: 8.0.2 ✅ | @vitejs/plugin-react: 6.0.1 ✅ | @tailwindcss/vite: 4.2.2 ✅ | tailwindcss: 4.2.2 ✅
- react-router: 7.13.2 ✅ | nuqs: 2.8.9 ✅ | express: 5.2.1 ✅ | zod: 4.3.6 ✅
- @tanstack/react-table: 8.21.3 ✅ | recharts: 3.8.0 ✅ | simple-git: 3.33.0 ✅ | stream-json: 2.0.0 ✅
- typescript: 6.0.2 ✅ | tsx: 4.21.0 ✅ | vitest: 4.1.1 ✅ | concurrently: 9.2.1 ✅

---

## Architecture Patterns

### Recommended Project Structure
```
gui/
├── package.json                # root — "workspaces": ["client","server","shared"]
│                               # "dev": "concurrently \"npm run dev -w client\" \"npm run dev -w server\""
├── client/
│   ├── package.json
│   ├── vite.config.ts          # tailwindcss() plugin, /api proxy to :3001
│   ├── index.html
│   └── src/
│       ├── main.tsx            # BrowserRouter + NuqsAdapter
│       ├── App.tsx             # <Routes> + <Route> tree
│       ├── globals.css         # @import tailwindcss; @theme inline; Fluent tokens
│       ├── components/
│       │   ├── ui/             # shadcn/ui auto-generated (shadcn add ...)
│       │   ├── layout/
│       │   │   ├── AppShell.tsx     # persistent sidebar + outlet
│       │   │   └── Sidebar.tsx
│       │   ├── dashboard/
│       │   │   ├── KPICard.tsx
│       │   │   ├── TierBarChart.tsx
│       │   │   ├── RbacSystemChart.tsx
│       │   │   ├── PimTypeChart.tsx
│       │   │   ├── RecentCommits.tsx
│       │   │   └── DataFreshness.tsx
│       │   └── objects/
│       │       ├── ObjectTable.tsx      # TanStack Table, manual modes
│       │       ├── ObjectFilters.tsx    # shadcn Popover+Command multi-selects
│       │       ├── ObjectDetailPanel.tsx # shadcn Sheet slide-out
│       │       └── RoleAssignmentRow.tsx # shadcn Collapsible
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── ObjectBrowser.tsx
│       │   └── ObjectDetail.tsx
│       ├── hooks/
│       │   ├── useObjects.ts     # fetch /api/objects with URL params
│       │   └── useDashboard.ts   # fetch /api/dashboard
│       └── lib/
│           └── api.ts            # typed fetch helpers (not axios — no extra dep)
├── server/
│   ├── package.json
│   ├── index.ts                # createServer() → app.listen(PORT, '127.0.0.1')
│   ├── routes/
│   │   ├── dashboard.ts        # GET /api/dashboard
│   │   ├── objects.ts          # GET /api/objects, GET /api/objects/:id
│   │   └── git.ts              # GET /api/git/recent
│   ├── middleware/
│   │   ├── security.ts         # helmet + host-validation + path-guard factory
│   │   └── errorHandler.ts     # 4-arg Express v5 error handler
│   └── services/
│       ├── eamReader.ts        # mtime-cache + BOM-strip + stream-json threshold
│       └── gitLog.ts           # simple-git, filtered to PrivilegedEAM/
└── shared/
    └── types/
        ├── eam.ts              # PrivilegedObject, RoleAssignment, Classification
        ├── api.ts              # Request/response shapes for all routes
        └── index.ts            # barrel re-export
```

### Pattern 1: Tailwind v4 CSS-First Setup
**What:** No `tailwind.config.js`. All config lives in one CSS file via `@theme` blocks.
**When to use:** Always — this is the only supported pattern for v4 with shadcn/ui.
```css
/* client/src/globals.css */
/* Source: https://tailwindcss.com/docs/upgrade-guide */
@import "tailwindcss";
@import "tw-animate-css";

/* 1. Raw token values in :root (NOT inside @layer base for v4) */
:root {
  --background: hsl(0 0% 100%);
  --foreground: oklch(0.145 0 0);
  --card: hsl(0 0% 100%);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --radius: 0.625rem;

  /* Fluent-inspired brand tokens (no Fluent UI React — Griffel conflicts with Tailwind) */
  --fluent-accent: oklch(0.52 0.22 261);        /* #0078D4 approximate in OKLCH */
  --fluent-accent-hover: oklch(0.46 0.20 261);
  --fluent-neutral-layer-1: oklch(0.99 0 0);
  --fluent-neutral-stroke: oklch(0.85 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark tokens */
}

/* 2. @theme inline — maps raw vars to Tailwind utilities */
/* Source: https://ui.shadcn.com/docs/tailwind-v4 */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-fluent-accent: var(--fluent-accent);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --font-sans: "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}
```

**Critical:** `@theme inline` (not `@theme`) means Tailwind references the CSS var directly without emitting a duplicate value. Required for OKLCH dark-mode colour switching to work.

### Pattern 2: shadcn/ui Initialisation
**What:** Use the shadcn CLI to scaffold the CSS skeleton and component primitives.
**When to use:** Phase 1 scaffolding — run once.
```bash
# Source: https://ui.shadcn.com/docs/installation/vite
cd gui/client
npx shadcn@latest init -t vite
# Choose: new-york style, oklch colors
# This generates: globals.css, components/ui/, lib/utils.ts

# Then add components as needed:
npx shadcn@latest add button badge card sheet collapsible popover command separator scroll-area skeleton table
```
**Note:** New projects always use `new-york` style (shadcn deprecated `default` style with Tailwind v4).

### Pattern 3: Express v5 Secure Server
**What:** Binding to loopback only, with async error handling and DNS-rebinding protection.
**When to use:** Always — must match FOUND-04 security requirements.
```typescript
// server/index.ts
// Source: https://expressjs.com/en/guide/migrating-5.html
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { securityMiddleware, errorHandler } from './middleware/security.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const CLIENT_BUILD = path.resolve(import.meta.dirname, '../../client/dist');

app.use(helmet());
app.use(express.json());
app.use(securityMiddleware);       // host-validation + path-guard

// API routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/objects', objectsRouter);
app.use('/api/git', gitRouter);

// Serve client build in production
app.use(express.static(CLIENT_BUILD));
// Express v5 wildcard syntax: /{*splat} matches root + all sub-paths
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
});

// 4-arg error handler (unchanged from v4 — still required)
app.use(errorHandler);

// MUST specify '127.0.0.1' — app.listen(PORT) binds to 0.0.0.0
const server = app.listen(Number(PORT), '127.0.0.1', (err?: Error) => {
  if (err) throw err;
  console.log(`EntraOps GUI server running at http://127.0.0.1:${PORT}`);
});
```

**Security middleware pattern:**
```typescript
// server/middleware/security.ts
import { Request, Response, NextFunction } from 'express';
import path from 'node:path';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

// DNS rebinding protection
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!ALLOWED_HOSTS.has(req.hostname)) {
    res.status(400).json({ error: 'Invalid host header' });
    return;
  }
  next();
}

// Path traversal guard factory
// Usage: const safePath = assertSafePath(BASE_DIR)(req.params.file)
export function assertSafePath(baseDir: string) {
  return (requestedPath: string): string => {
    const resolved = path.resolve(baseDir, requestedPath);
    // path.join does NOT prevent traversal — path.resolve + startsWith does
    if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
      const err = Object.assign(new Error('Path traversal attempt'), { status: 403 });
      throw err;
    }
    return resolved;
  };
}

// 4-arg async-aware error handler
export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  // Never expose stack traces to client
  res.status(status).json({ error: err.message ?? 'Internal server error' });
}
```

### Pattern 4: Vite Proxy Config
**What:** `/api/*` calls from the SPA are proxied to Express during development.
```typescript
// client/vite.config.ts
// Source: https://vite.dev/config/server-options#server-proxy
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,   // do NOT change — keeps Host header as localhost
      },
    },
  },
});
```

### Pattern 5: URL-Reflected Filter State with nuqs
**What:** All Object Browser filter/sort/page state lives in the URL.
**When to use:** OBJ-04 requirement — bookmarkable, shareable views.
```typescript
// client/src/main.tsx
// Source: https://nuqs.dev/docs/adapters (React Router v7 section)
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { BrowserRouter } from 'react-router';

root.render(
  <BrowserRouter>
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </BrowserRouter>
);
```

```typescript
// client/src/pages/ObjectBrowser.tsx
// Source: https://nuqs.dev/docs/parsers/built-in#native-arrays
import { useQueryStates, parseAsNativeArrayOf, parseAsString,
         parseAsInteger, parseAsIndex, parseAsStringLiteral } from 'nuqs';

const SORT_DIRS = ['asc', 'desc'] as const;

// All decoded/encoded automatically; URL: ?tier=ControlPlane&tier=ManagementPlane&q=thomas&page=2
const [filters, setFilters] = useQueryStates({
  tier:     parseAsNativeArrayOf(parseAsString),            // ?tier=X&tier=Y
  rbac:     parseAsNativeArrayOf(parseAsString),            // ?rbac=EntraID&rbac=Defender
  type:     parseAsNativeArrayOf(parseAsString),            // ?type=user
  pim:      parseAsNativeArrayOf(parseAsString),            // ?pim=Permanent
  onprem:   parseAsNativeArrayOf(parseAsString),            // ?onprem=true
  q:        parseAsString.withDefault(''),                  // ?q=thomas
  page:     parseAsIndex.withDefault(0),                   // ?page=2 → internal 0-indexed
  pageSize: parseAsInteger.withDefault(50),
  sortBy:   parseAsString.withDefault('ObjectAdminTierLevel'),
  sortDir:  parseAsStringLiteral(SORT_DIRS).withDefault('asc'),
});
```

**`parseAsIndex` vs `parseAsInteger`:** `parseAsIndex` stores 1-based in URL (human-friendly: `?page=2` = index 1), `parseAsInteger` stores as-is. Use `parseAsIndex` for page number.

### Pattern 6: TanStack Table in Server-Side Mode
**What:** Table renders only what Express returns; no client-side sorting/filtering/pagination.
**When to use:** OBJ-01 — required; large tenant datasets may have thousands of objects.
```typescript
// Source: https://tanstack.com/table/latest/docs/guide/pagination#manual-server-side-pagination
import { useReactTable, getCoreRowModel, type SortingState,
         type PaginationState, type ColumnFiltersState } from '@tanstack/react-table';

function ObjectTable({ data, total, pagination, setPagination, sorting, setSorting }) {
  const table = useReactTable({
    data,
    columns,
    rowCount: total,           // tells table total rows across all pages
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,    // Express handles slicing
    manualSorting: true,       // Express handles ordering
    manualFiltering: true,     // Express handles filtering
    getCoreRowModel: getCoreRowModel(),
    // DO NOT provide getSortedRowModel or getPaginationRowModel — they're for client-side
  });
  // render table.getRowModel().rows ...
}
```

**Critical:** Do not mix manual and automatic modes. Using `getSortedRowModel` with `manualPagination: true` would sort only the current page — wrong.

### Pattern 7: EAM File Reading with Caching and BOM Stripping
**What:** Reads `PrivilegedEAM/{Sistema}/{Sistema}.json` with mtime-based invalidation and Windows BOM handling.
```typescript
// server/services/eamReader.ts
import fs from 'node:fs/promises';
import path from 'node:path';

interface CacheEntry { data: unknown; mtime: number; expiry: number }
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;    // 5 minutes
const STREAM_THRESHOLD = 50 * 1024 * 1024; // stream if > 50 MB

export async function readEamJson(filePath: string): Promise<unknown> {
  const stat = await fs.stat(filePath);
  const cached = CACHE.get(filePath);
  if (cached && cached.mtime === stat.mtimeMs && Date.now() < cached.expiry) {
    return cached.data;
  }

  let data: unknown;
  if (stat.size > STREAM_THRESHOLD) {
    data = await streamParseJson(filePath);  // uses stream-json
  } else {
    const raw = await fs.readFile(filePath, 'utf8');
    // Critical: PowerShell writes UTF-8 BOM (\uFEFF) — JSON.parse will throw without this
    const content = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
    data = JSON.parse(content);
  }

  CACHE.set(filePath, { data, mtime: stat.mtimeMs, expiry: Date.now() + CACHE_TTL_MS });
  return data;
}
```

### Pattern 8: Git Log for Recent Commits Widget
```typescript
// server/services/gitLog.ts
// Source: simple-git v3 docs
import simpleGit from 'simple-git';
import path from 'node:path';

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve('.');

export async function getRecentPrivilegedEAMCommits(count = 5) {
  const git = simpleGit(REPO_ROOT);
  // Filter log to commits that touched the PrivilegedEAM/ directory
  const log = await git.log({
    maxCount: count,
    '--': null,
    'PrivilegedEAM/': null,
  });
  return log.all.map(c => ({
    hash: c.hash.slice(0, 7),
    message: c.message,
    author: c.author_name,
    date: c.date,
  }));
}
```

**Note:** If `PrivilegedEAM/` has no git history yet, `log.all` will be an empty array — handle this as the empty state, not an error.

### Pattern 9: PrivilegedEAM Object TypeScript Interface
**Derived from `Invoke-EntraOpsEAMClassificationAggregation.ps1` (verified 2026-03-24):**
```typescript
// shared/types/eam.ts

export type EamTier = 'ControlPlane' | 'ManagementPlane' | 'UserAccess' | 'Unclassified';
export type RbacSystem = 'EntraID' | 'ResourceApps' | 'IdentityGovernance' | 'DeviceManagement' | 'Defender';
export type ObjectType = 'user' | 'group' | 'serviceprincipal' | 'unknown';
export type PimAssignmentType = 'Permanent' | 'Eligible' | 'NoAssignment';

export interface Classification {
  AdminTierLevel: string;        // '0' | '1' | '2' | 'Unclassified'
  AdminTierLevelName: EamTier;
  Service: string;
  TaggedBy: string;
}

export interface RoleAssignment {
  RoleAssignmentId: string;
  RoleAssignmentScopeId: string;
  RoleAssignmentScopeName: string;
  RoleAssignmentType: string;      // 'Direct' | 'Transitive' etc.
  RoleAssignmentSubType: string | null;
  PIMManagedRole: boolean | string;
  PIMAssignmentType: PimAssignmentType;
  RoleDefinitionName: string;
  RoleDefinitionId: string;
  RoleType: string;
  RoleIsPrivileged: boolean;
  RoleDefinitionActions: string[];
  Classification: Classification[];
  TransitiveByObjectId: string | null;
  TransitiveByObjectDisplayName: string | null;
}

export interface PrivilegedObject {
  ObjectId: string;
  ObjectType: ObjectType;
  ObjectSubType: string | null;
  ObjectDisplayName: string;
  ObjectUserPrincipalName: string | null;
  ObjectAdminTierLevel: string;        // '0' | '1' | '2'
  ObjectAdminTierLevelName: EamTier;
  OnPremSynchronized: boolean | null;
  AssignedAdministrativeUnits: unknown[] | null;
  RestrictedManagementByRAG: boolean | null;
  RestrictedManagementByAadRole: boolean | null;
  RestrictedManagementByRMAU: boolean | null;
  RoleSystem: RbacSystem;
  Classification: Classification[];
  RoleAssignments: RoleAssignment[];
  Sponsors: unknown[] | null;
  Owners: unknown[] | null;
  OwnedObjects: unknown[] | null;
  OwnedDevices: unknown[] | null;
  IdentityParent: unknown | null;
  AssociatedWorkAccount: unknown | null;
  AssociatedPawDevice: unknown | null;
}
```

**File layout on disk:**
```
PrivilegedEAM/
├── EntraID/
│   ├── EntraID.json           # aggregate file — ALL objects for this RBAC system
│   └── <ObjectId>.json        # per-object file
├── ResourceApps/
│   ├── ResourceApps.json
│   └── <ObjectId>.json
├── DeviceManagement/
├── IdentityGovernance/
└── Defender/
```
**Read strategy:** For dashboard aggregates and object browser, read the aggregate `{System}.json` files (one per RBAC system). For detail panel (single object), read `{ObjectId}.json` if it exists, else filter the aggregate.

### Anti-Patterns to Avoid
- **`@tailwind base/components/utilities` directives** — removed in v4; use `@import "tailwindcss"` instead
- **`tailwind.config.js` without `@config` directive** — v4 does not auto-detect JS config; use CSS `@theme` block
- **`tailwindcss-animate` package** — deprecated for v4; use `tw-animate-css`
- **`app.listen(PORT)` without host** — binds to 0.0.0.0; always pass `'127.0.0.1'`
- **`/*` wildcard in Express v5** — invalid syntax; use `/{*splat}` for root+all or `/*splat` for non-root
- **`res.json(data, 200)` in Express v5** — removed; use `res.status(200).json(data)`
- **`nuqs/adapters/react-router`** — deprecated; use `nuqs/adapters/react-router/v7`
- **`z.string().email()` in Zod v4** — deprecated; use top-level `z.email()`
- **`z.record(z.string())`** — Zod v4 requires two args: `z.record(z.string(), z.string())`
- **`{ message: }` in Zod schema options** — deprecated in v4; use `{ error: }`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select filter dropdowns | Custom dropdown with checkboxes | shadcn/ui Popover + Command (combobox pattern) | Command handles search within options, keyboard navigation, a11y out of the box |
| Slide-out detail panel | Absolute-positioned div with z-index | shadcn/ui `<Sheet>` | Focus trapping, ARIA, escape key, backdrop click handled |
| Expandable rows | Manual `useState` + `max-height` animation | shadcn/ui `<Collapsible>` | Radix-powered; handles ARIA expanded state |
| Dashboard charts | `<canvas>` or SVG from scratch | Recharts via shadcn/ui `<ChartContainer>` | Responsive, accessible, Tailwind colour token integration |
| URL query param sync | `useSearchParams` + manual JSON parse | nuqs parsers | Type-safe; handles arrays, enums, integers; batches updates |
| Security HTTP headers | Setting headers manually | helmet | Covers 10+ headers including CSP, HSTS, X-Frame-Options |
| Path traversal prevention | `req.path.includes('..')` check | `path.resolve()` + `startsWith()` assertion | String checks miss encoded variants; `path.resolve()` normalises first |
| Git log parsing | `child_process.exec('git log --format=...')` | simple-git | Cross-platform (no shell); structured API; no quoting issues on Windows/PowerShell |
| Large JSON streaming | Custom line-by-line reader | stream-json | Handles standard JSON (not NDJSON); proper backpressure |
| Schema validation of API query params | Manual type checks | Zod v4 + `.safeParse()` | Single source of truth; error messages for free |
| Toast/notification system | Custom state + portal | sonner (shadcn/ui default) | Battle-tested animations, stack management, accessibility |

**Key insight:** shadcn/ui components are the single biggest time-saving pattern in this stack. Unlike a component library, you own the code after `shadcn add`, so you can modify freely — but the generated code handles all the complexity that beginners routinely get wrong (focus trapping, keyboard nav, ARIA roles, animation timing).

---

## Common Pitfalls

### Pitfall 1: Express v5 SPA Fallback Wildcard
**What goes wrong:** `app.get('/*', handler)` crashes with a route parsing error at startup in Express v5.
**Why it happens:** Express v5 changed wildcard syntax — the `*` must be named. `/*` is invalid.
**How to avoid:**
```typescript
// ❌ Express v4 syntax — WILL THROW in v5
app.get('/*', (req, res) => res.sendFile(indexHtml));

// ✅ Express v5 — matches root AND all sub-paths
app.get('/{*splat}', (req, res) => res.sendFile(indexHtml));
```
**Warning signs:** Server crashes on startup with "TypeError: Cannot read properties of undefined"; or SPA returns 404 on hard refresh.

### Pitfall 2: Windows UTF-8 BOM in PowerShell-Generated JSON
**What goes wrong:** `JSON.parse()` throws `SyntaxError: Unexpected token` on the very first file read.
**Why it happens:** PowerShell's `ConvertTo-Json | Set-Content` writes a UTF-8 BOM (`\uFEFF`) at byte 0. Node.js `fs.readFile(..., 'utf8')` passes the BOM through, and `JSON.parse` rejects it.
**How to avoid:**
```typescript
// Strip BOM before parsing — always, not just on Windows
const raw = await fs.readFile(filePath, 'utf8');
const content = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
const data = JSON.parse(content);
```
**Warning signs:** Works perfectly on macOS dev machine, fails immediately when a user runs it on Windows.

### Pitfall 3: Tailwind v4 `@theme` vs `@theme inline`
**What goes wrong:** Dark mode colour toggle does not work, or colours appear doubled/overridden.
**Why it happens:** `@theme` emits CSS custom properties (e.g., `--color-background: ...`) that duplicate the raw `:root` variables. `@theme inline` emits references (`--color-background: var(--background)`) instead, which means toggling `.dark` on `<html>` correctly re-resolves the value.
**How to avoid:** Always use `@theme inline` when providing colour tokens from `:root` / `.dark`. Standard pattern from shadcn/ui Tailwind v4 docs.
**Warning signs:** Component background doesn't change when toggling dark mode; two sets of custom properties visible in browser devtools.

### Pitfall 4: Mixing Manual + Automatic TanStack Table Modes
**What goes wrong:** Table appears to sort correctly on first click but shows wrong results because it is sorting only the current page.
**Why it happens:** If you pass `getSortedRowModel` but also set `manualPagination: true`, client-side sorting applies to data that is already sliced to one page.
**How to avoid:** Use ALL manual modes together, or ALL client-side modes. Never mix.
**Warning signs:** Sorting a column on page 2 "works" but produces inconsistent ordering relative to page 1.

### Pitfall 5: nuqs Adapter Version Mismatch
**What goes wrong:** `useQueryState` silently reads stale values or throws "nuqs requires an adapter" console error.
**Why it happens:** Using the deprecated `nuqs/adapters/react-router` (points to v6) instead of `nuqs/adapters/react-router/v7`. v6 adapter imports from `react-router-dom`; v7 imports from `react-router`.
**How to avoid:**
```typescript
// ❌ Deprecated — will log warnings, may break with React Router v7
import { NuqsAdapter } from 'nuqs/adapters/react-router';

// ✅ Correct for React Router v7
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
```

### Pitfall 6: Path Traversal via `path.join()`
**What goes wrong:** A crafted request for `../../Classification/Templates/Classification_AadResources.json` reads files outside `PrivilegedEAM/`.
**Why it happens:** `path.join('/base', '../secret')` resolves to `/secret` cleanly — it does NOT block traversal.
**How to avoid:** Use `path.resolve()` and assert the result starts with the allowed base:
```typescript
const resolved = path.resolve(PRIVILEGED_EAM_BASE, userInput);
if (!resolved.startsWith(PRIVILEGED_EAM_BASE + path.sep)) {
  throw Object.assign(new Error('Forbidden'), { status: 403 });
}
```
**Warning signs:** Any file-serving route that uses user-supplied path segments without this check.

### Pitfall 7: Recharts ResponsiveContainer Height
**What goes wrong:** Chart renders with 0 height and is invisible.
**Why it happens:** `ResponsiveContainer height="100%"` requires the parent to have a fixed pixel height. If the parent is `height: auto`, the container collapses.
**How to avoid:** Set explicit height in pixels or use a fixed Tailwind class:
```tsx
// ❌ Parent has height: auto — chart invisible
<div className="w-full h-full">
  <ResponsiveContainer width="100%" height="100%">...</ResponsiveContainer>
</div>

// ✅ Use shadcn/ui ChartContainer which wraps ResponsiveContainer correctly
<ChartContainer config={chartConfig} className="h-[200px] w-full">
  <BarChart data={data}>...</BarChart>
</ChartContainer>
```

### Pitfall 8: Zod v4 API Differences from v3 Examples
**What goes wrong:** Schema validation crashes with "TypeError: schema.message is not a function" or similar.
**Why it happens:** Online examples (Stack Overflow, GitHub) still show Zod v3 APIs. Zod v4 changed several APIs.
**How to avoid — key differences:**
```typescript
// ❌ Zod v3 patterns (still compile but trigger deprecation warnings in v4)
z.string().email()           // → z.email()
z.record(z.string())         // → z.record(z.string(), z.string())
z.object({}).strict()        // → z.strictObject({})
schema.min(5, { message: 'Too short' })  // → { error: 'Too short' }

// ✅ Zod v4 patterns
z.email()
z.record(z.string(), z.string())
z.strictObject({})
schema.min(5, { error: 'Too short' })
```

---

## Code Examples

### Express v5 Async Route with Zod Validation
```typescript
// server/routes/objects.ts
// Source: https://expressjs.com/en/guide/migrating-5.html (rejected promises section)
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const QuerySchema = z.object({
  tier:     z.array(z.string()).optional(),
  rbac:     z.array(z.string()).optional(),
  type:     z.array(z.string()).optional(),
  pim:      z.array(z.string()).optional(),
  onprem:   z.array(z.string()).optional(),
  q:        z.string().optional(),
  page:     z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy:   z.string().default('ObjectAdminTierLevel'),
  sortDir:  z.enum(['asc', 'desc']).default('asc'),
});

// In Express v5, async routes that throw automatically forward to the error handler
router.get('/', async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const objects = await queryObjects(parsed.data);
  res.json(objects);
});
```

### shadcn/ui Multi-Select Filter via Command Popover
```tsx
// components/objects/ObjectFilters.tsx — multi-select using shadcn Command
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIERS = ['ControlPlane', 'ManagementPlane', 'UserAccess'] as const;

function TierFilter({ value, onChange }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          Tier
          {value.length > 0 && <Badge variant="secondary">{value.length}</Badge>}
          <ChevronDown className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandList>
            {TIERS.map(tier => (
              <CommandItem
                key={tier}
                onSelect={() => {
                  const next = value.includes(tier)
                    ? value.filter(v => v !== tier)
                    : [...value, tier];
                  onChange(next);
                }}
              >
                <Check className={cn('mr-2 size-4', value.includes(tier) ? 'opacity-100' : 'opacity-0')} />
                {tier}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### shadcn/ui Sheet Detail Panel
```tsx
// Detail panel triggered when row is clicked
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function ObjectDetailPanel({ objectId, open, onClose }) {
  // fetch /api/objects/:objectId
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{object?.ObjectDisplayName}</SheetTitle>
        </SheetHeader>
        {/* Role assignments with expandable actions */}
        {object?.RoleAssignments.map(ra => (
          <Collapsible key={ra.RoleAssignmentId}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
              {ra.RoleDefinitionName}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="text-xs font-mono text-muted-foreground">
                {ra.RoleDefinitionActions.join('\n')}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SheetContent>
    </Sheet>
  );
}
```

### Dashboard KPI Aggregation (Express)
```typescript
// server/routes/dashboard.ts
router.get('/', async (_req, res) => {
  const allObjects = await getAllCachedObjects();   // reads all 5 aggregate files
  
  const tierCounts = { ControlPlane: 0, ManagementPlane: 0, UserAccess: 0 };
  const byTierAndType: Record<string, Record<string, number>> = {};
  
  for (const obj of allObjects) {
    const tier = obj.ObjectAdminTierLevelName;
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
    
    byTierAndType[tier] ??= {};
    const type = obj.ObjectType;
    byTierAndType[tier][type] = (byTierAndType[tier][type] ?? 0) + 1;
  }
  
  res.json({ tierCounts, byTierAndType, generatedAt: new Date().toISOString() });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + `@tailwind` directives | CSS-first `@import "tailwindcss"` + `@theme` | v4.0 (Jan 2025) | All v3 tutorials are wrong; no config file needed |
| `tailwindcss-animate` plugin | `tw-animate-css` package | Mar 2025 | `@plugin 'tailwindcss-animate'` removed; use `@import "tw-animate-css"` |
| shadcn `default` style | `new-york` style (only option for new v4 projects) | Early 2025 | HSL colors → OKLCH; `forwardRef` removed |
| Express v4 async error handling (manual `try/catch` + `next(err)`) | Express v5 native async (rejected promises auto-forwarded) | v5 GA (2024) | Eliminates most `try/catch` boilerplate in route handlers |
| `nuqs/adapters/react-router` (generic) | `nuqs/adapters/react-router/v7` (versioned) | nuqs 2.x | Old import deprecated and will be removed in nuqs v3 |
| `z.string().email()` | `z.email()` | Zod v4 (2025) | Top-level format validators; old method still works but deprecated |
| `z.record(schema)` single-arg | `z.record(keySchema, valueSchema)` two-args required | Zod v4 | Single-arg removed; TypeScript error if missed |
| `React.forwardRef` in shadcn components | Direct function components with `React.ComponentProps` | React 19 / shadcn v4 | Simpler component code; `ref` as regular prop |

**Deprecated/outdated:**
- `react-router-dom` (package name): React Router v7 exports from `react-router` for library mode (not framework mode). No need to install `react-router-dom` separately.
- `postcss.config.js` with tailwindcss: replaced by `@tailwindcss/vite` plugin; no PostCSS file needed at all.
- `concurrently --kill-others-on-fail` was the v8 flag; v9 may have changed flags — verify with `concurrently --help` during scaffold.

---

## Open Questions

1. **TypeScript 6 breaking changes**
   - What we know: TypeScript 6.0.2 is the current npm release (verified 2026-03-24)
   - What's unclear: Specific breaking changes from TS 5.x to 6.x — training data predates this release
   - Recommendation: Run `tsc --noEmit` after scaffolding; fix any type errors before proceeding. Use `"strict": true` in tsconfig.

2. **Segoe UI Variable font availability on non-Windows**
   - What we know: The font is not a web font — it's a system font installed with Windows 11+
   - What's unclear: Whether macOS/Linux users get a fallback that looks acceptably close
   - Recommendation: CSS font stack `"Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, sans-serif` gracefully degrades. No web font download needed. Document this as expected behaviour.

3. **ENTRAOPS_ROOT environment variable vs. relative paths**
   - What we know: The Express server needs to know where the repo root is to find `PrivilegedEAM/`
   - What's unclear: Whether to use `process.env.ENTRAOPS_ROOT` or `cwd()`-relative; the server runs from `gui/server/` so `../..` == repo root
   - Recommendation: Default to `path.resolve(import.meta.dirname, '../../..')` (three levels up from `gui/server/src/`) with an `ENTRAOPS_ROOT` env override. Document this in README.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `gui/client/vite.config.ts` (shared) / `gui/server/vitest.config.ts` (separate) |
| Quick run command | `npm test -w gui/server` or `npm test -w gui/client` |
| Full suite command | `npm run test:run -w gui` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-04 | Security middleware blocks bad Host header | unit | `vitest run server/middleware/security.test.ts` | ❌ Wave 0 |
| FOUND-04 | Path traversal guard rejects `../` paths | unit | `vitest run server/middleware/security.test.ts` | ❌ Wave 0 |
| FOUND-08 | BOM-stripped JSON parses correctly | unit | `vitest run server/services/eamReader.test.ts` | ❌ Wave 0 |
| FOUND-08 | Windows path separators normalised in API responses | unit | `vitest run server/services/eamReader.test.ts` | ❌ Wave 0 |
| OBJ-04 | URL reflects filter state after multi-select | component | `vitest run client/src/pages/ObjectBrowser.test.tsx` | ❌ Wave 0 |
| DASH-07 | Empty state renders when `PrivilegedEAM/` dir absent | component | `vitest run client/src/pages/Dashboard.test.tsx` | ❌ Wave 0 |
| FOUND-01 | `npm install` exits 0 in all three workspaces | smoke | manual / CI only | — |
| FOUND-02 | `npm run dev` brings up both servers | smoke | manual only | — |

### Sampling Rate
- **Per task commit:** `npm test --run -w gui/server` (unit tests, < 5s)
- **Per wave merge:** `npm run test:run -w gui` (all unit + component tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `gui/server/middleware/security.test.ts` — covers FOUND-04 host-validation and path-traversal guard
- [ ] `gui/server/services/eamReader.test.ts` — covers FOUND-08 BOM stripping, Windows path normalisation
- [ ] `gui/client/src/pages/ObjectBrowser.test.tsx` — covers OBJ-04 URL state reflection
- [ ] `gui/client/src/pages/Dashboard.test.tsx` — covers DASH-07 empty state
- [ ] `gui/server/vitest.config.ts` — server test config (no DOM environment needed)
- [ ] `gui/client/vite.config.ts` test section — add `test: { environment: 'jsdom' }` config

---

## Sources

### Primary (HIGH confidence)
- `tailwindcss@4.2.2` npm + `https://tailwindcss.com/docs/upgrade-guide` — v4 CSS-first config, `@theme inline`, removed `@tailwind` directives
- `https://ui.shadcn.com/docs/tailwind-v4` — shadcn/ui full Tailwind v4 + React 19 support confirmed; `tw-animate-css` replacement; `new-york` style; OKLCH; `@theme inline` pattern
- `https://ui.shadcn.com/docs/installation/vite` — `shadcn@latest init -t vite` command confirmed
- `https://expressjs.com/en/guide/migrating-5.html` — Express v5 wildcard `/{*splat}`, async promises, removed methods, `app.listen(port, host, cb)` error-first callback
- `https://tanstack.com/table/latest/docs/guide/pagination` + `docs/guide/sorting` — `manualPagination: true`, `rowCount`, no `getSortedRowModel` for server-side
- `https://nuqs.dev/docs/adapters` — `nuqs/adapters/react-router/v7` confirmed; React Router v7 section
- `https://nuqs.dev/docs/parsers` — `parseAsNativeArrayOf`, `parseAsIndex`, `parseAsStringLiteral` confirmed
- `https://zod.dev/v4/changelog` — Zod v4 breaking changes: `{ error: }`, `z.email()`, `z.record()` two-arg, `.merge()` deprecated
- `/Users/nathanhutchinson/Dev/EntraOps/EntraOps/Private/Invoke-EntraOpsEAMClassificationAggregation.ps1` — verified complete PrivilegedEAM object schema
- `npm view <package> version` (all packages) — verified current npm versions 2026-03-24

### Secondary (MEDIUM confidence)
- `https://reactrouter.com/start/library/installation` — React Router v7 declarative mode: `<BrowserRouter>` + `import from 'react-router'` confirmed  
- `https://reactrouter.com/how-to/search-params` — React Router v7 `useSearchParams` hook (nuqs wraps this)

### Tertiary (LOW confidence)
- TypeScript 6.0.2 breaking changes — not fully researched; training data predates this release

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions live-verified with `npm view`
- Architecture patterns: HIGH — all code samples cross-referenced with official docs
- Pitfalls: HIGH — BOM, Express wildcard, Tailwind v4 theme verified against official docs
- TypeScript 6 specifics: LOW — live-verified that 6.0.2 is current; breaking changes not researched

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable ecosystem; Tailwind, shadcn, nuqs could have point releases but patterns stable)
