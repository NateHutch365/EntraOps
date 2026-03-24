# Architecture Patterns — EntraOps GUI

**Domain:** Local-first React + Express developer dashboard within an existing PowerShell repo  
**Researched:** 24 March 2026  
**Confidence:** HIGH (verified against Vite 8 docs, Express 5 docs, Node.js 22 docs, known patterns from similar local tooling)

---

## Executive Architectural Decision

**Use a `gui/` subdirectory with co-located frontend and backend, sharing a `/shared/types` layer.**

This is the standard pattern for owner-operated local developer tools (VS Code extensions with a webview host, Nx Console, Nx Local Storybook, GitHub Desktop webviews, Backstage local mode). The separation between `gui/client/` and `gui/server/` gives clear coupling points without the complexity of a true monorepo.

---

## Component Boundaries

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (localhost:5173 in dev / built static in prod)              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  React + TypeScript + Vite SPA                                  │ │
│  │                                                                 │ │
│  │  Pages:   Dashboard  │ Browser  │ Templates  │ Runner  │ History │ │
│  │                          ↓ useQuery / useMutation               │ │
│  │  TanStack Query  ←──── API Client (fetch /api/*)                │ │
│  │  React Router    ←──── URL search params (filter state)         │ │
│  │  Zustand         ←──── Local UI state (panel open, cmd status)  │ │
│  └────────────────────────────┬────────────────────────────────────┘ │
└───────────────────────────────│──────────────────────────────────────┘
                                │ HTTP (proxied by Vite in dev)
                                │ → localhost:3001/api/*
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Express 5 + Node.js 22 (TypeScript via tsx)  — localhost:3001       │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ /api/eam    │  │ /api/      │  │ /api/git      │  │ /api/run  │ │
│  │ (read JSON) │  │ templates  │  │ (simple-git)  │  │ (pwsh)    │ │
│  │             │  │ (Zod+write)│  │               │  │ SSE stream│ │
│  └──────┬──────┘  └──────┬─────┘  └──────┬────────┘  └─────┬─────┘ │
│         │                │               │                  │       │
│  ┌──────▼────────────────▼───────────────▼──────────────────▼─────┐ │
│  │  Services Layer                                                  │ │
│  │  EamFileService  │  TemplateService  │  GitService  │  RunnerSvc │ │
│  └──────┬────────────────┬──────────────────┬──────────────┬───────┘ │
│         │                │                  │              │         │
│  ┌──────▼────────────────▼──────────────────▼──────────────▼───────┐ │
│  │  IO Layer (Node.js fs, simple-git, child_process.spawn)          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ Reads / Writes
┌──────────────────────────────────────────────────────────────────────┐
│  File System (repository root, relative to gui/)                     │
│                                                                      │
│  ../PrivilegedEAM/{System}.json     ← read-only (EAM data)          │
│  ../Classification/Templates/*.json ← read + validated write         │
│  ../Classification/Global.json      ← read + validated write         │
│  ../EntraOpsConfig.json             ← read + validated write         │
│  ../.git/                           ← read via simple-git            │
│  ../EntraOpsConfig.json             ← read for config                │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (Phase 3 only)
┌──────────────────────────────────────────────────────────────────────┐
│  PowerShell 7 (pwsh / pwsh.exe)                                      │
│  stdout/stderr → child_process.spawn → SSE stream → browser         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
EntraOps/                           ← existing repo root (DO NOT TOUCH)
├── gui/                            ← new subdirectory (all GUI code here)
│   ├── package.json                ← workspace root: scripts, concurrently
│   ├── package-lock.json
│   ├── tsconfig.json               ← base tsconfig (referenced by client + server)
│   ├── .gitignore                  ← dist/, node_modules/, .env
│   ├── README.md                   ← GUI setup instructions
│   │
│   ├── shared/                     ← types shared between client and server
│   │   └── types/
│   │       ├── eam.ts              ← EAM object shape (EamObject, RoleAssignment, etc.)
│   │       ├── templates.ts        ← Classification template shape (Tier, Category, etc.)
│   │       ├── git.ts              ← Commit summary, diff hunk types
│   │       ├── runner.ts           ← Allowed cmdlet names, parameter shapes
│   │       └── api.ts              ← API request/response envelope types
│   │
│   ├── client/                     ← Vite SPA (React)
│   │   ├── index.html
│   │   ├── vite.config.ts          ← proxy /api → localhost:3001
│   │   ├── tsconfig.json           ← extends ../tsconfig.json
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx             ← React Router root
│   │       ├── globals.css         ← @import "tailwindcss"; @theme {}
│   │       │
│   │       ├── pages/              ← one file per route
│   │       │   ├── DashboardPage.tsx
│   │       │   ├── BrowserPage.tsx
│   │       │   ├── TemplatesPage.tsx
│   │       │   ├── RunnerPage.tsx  ← Phase 3
│   │       │   └── HistoryPage.tsx ← Phase 4
│   │       │
│   │       ├── components/         ← shared UI components
│   │       │   ├── ui/             ← shadcn/ui generated components
│   │       │   ├── layout/         ← AppShell, Sidebar, TopBar
│   │       │   └── domain/         ← EamTable, TierBadge, TierChart, etc.
│   │       │
│   │       ├── hooks/              ← TanStack Query hooks (data layer)
│   │       │   ├── useEamSummary.ts
│   │       │   ├── useEamObjects.ts
│   │       │   ├── useTemplates.ts
│   │       │   └── useGitHistory.ts
│   │       │
│   │       ├── store/              ← Zustand stores (local UI state)
│   │       │   ├── useFilterStore.ts
│   │       │   └── useRunnerStore.ts  ← Phase 3
│   │       │
│   │       └── lib/
│   │           ├── apiClient.ts    ← typed fetch wrapper
│   │           └── queryClient.ts  ← TanStack Query client config
│   │
│   └── server/                     ← Express backend
│       ├── tsconfig.json           ← extends ../tsconfig.json, no DOM lib
│       └── src/
│           ├── index.ts            ← app entry: create Express app, mount routes, listen
│           │
│           ├── routes/             ← Express Router per feature domain
│           │   ├── eam.ts          ← GET /api/eam/summary, /api/eam/objects, /api/eam/:id
│           │   ├── templates.ts    ← GET/PUT /api/templates/:system, /api/globals
│           │   ├── git.ts          ← GET /api/git/commits, /api/git/diff
│           │   ├── runner.ts       ← POST /api/run (SSE), DELETE /api/run (kill) — Phase 3
│           │   └── config.ts       ← GET/PUT /api/config — Phase 5
│           │
│           ├── services/           ← business logic, isolated from Express
│           │   ├── EamFileService.ts
│           │   ├── TemplateService.ts
│           │   ├── GitService.ts
│           │   └── RunnerService.ts   ← Phase 3
│           │
│           ├── middleware/
│           │   └── errorHandler.ts
│           │
│           └── lib/
│               ├── paths.ts        ← resolve repo root relative to gui/
│               └── cache.ts        ← in-memory EAM file cache (Map + TTL)
```

**Key rule:** `gui/shared/` imports from neither `client/` nor `server/`. Both client and server import from `shared/`. This prevents accidental server code leaking to the browser bundle.

---

## Data Flow

### 1. Dashboard & Object Browser (Phases 1)

```
Browser                   Express                        Filesystem
──────                    ───────                        ──────────
load DashboardPage
  → useEamSummary()
    → GET /api/eam/summary ──→ EamFileService
                                  → paths.ts: resolve PrivilegedEAM/
                                  → cache.ts: hit? return cached
                                  → cache miss: fs.readFile({System}.json)
                                  → JSON.parse (sync, in Node worker via threadpool)
                                  → store in Map with TTL (5min default)
                                  → aggregate: tier counts, RBAC system counts, etc.
                              ← { summary: {...}, freshness: ISO timestamp }
  ← render KPI cards

load BrowserPage
  → useEamObjects({ filters, page, pageSize })
    → GET /api/eam/objects?tier=0&page=1&pageSize=50 ──→ EamFileService
                                                           → same cache (already warm)
                                                           → filter + paginate in-memory
                                                           → return page slice
  ← render table (50 objects)
```

### 2. Template Editor (Phase 2)

```
Browser                   Express                        Filesystem
──────                    ───────                        ──────────
load TemplatesPage
  → useTemplates('AadResources')
    → GET /api/templates/AadResources ──→ TemplateService
                                           → fs.readFile Classification/Templates/
                                             Classification_AadResources.json
                                           → return parsed JSON
  ← render structured editor

user edits RoleDefinitionActions list
  → useMutation: PUT /api/templates/AadResources
    → body: { updated template JSON }    ──→ TemplateService
                                              → Zod.parse(body) against templateSchema
                                              → parse error? → 400 + validation errors
                                              → fs.writeFile (atomic: write temp → rename)
                                              → return 200 { saved: true }
  ← TanStack Query invalidates
    → re-fetch GET /api/templates/AadResources
```

### 3. PowerShell Command Runner (Phase 3, SSE-based)

```
Browser                   Express                        PowerShell Process
──────                    ───────                        ──────────────────
user clicks "Run"
  → POST /api/run
    body: { cmdlet: 'Save-EntraOpsPrivilegedEAMJson',
            params: { RbacSystems: ['EntraId'] } }
                          → RunnerService
                            → validate cmdlet ∈ ALLOWLIST
                            → build pwsh argv[] from params
                            → child_process.spawn('pwsh', ['-Command', ...])
                            → set res headers:
                              Content-Type: text/event-stream
                              Cache-Control: no-cache
                              Connection: keep-alive
                            → process.stdout.on('data') → res.write('data: ...\n\n')
                            → process.stderr.on('data') → res.write('event: stderr\ndata: ...\n\n')
                            → process.on('close') → res.write('event: done\ndata: ...\n\n')
                                                      res.end()

  EventSource listens:
  ← data events → append to terminal display (ansi-to-html)
  ← done event  → TanStack Query: invalidate /api/eam/* cache

user clicks "Stop":
  → DELETE /api/run    ──→ RunnerService.killCurrentProcess()
                           → process.kill('SIGTERM')
```

### 4. Git History (Phase 4)

```
Browser                   Express                         simple-git
──────                    ───────                         ──────────
load HistoryPage
  → useGitHistory()
    → GET /api/git/commits ──→ GitService
                                → simpleGit(repoRoot)
                                  .log({ file: 'PrivilegedEAM/', maxCount: 50 })
                                → return commit list
  ← render commit list

user selects commit pair
  → GET /api/git/diff?from=abc123&to=def456&file=EntraId ──→ GitService
                                                               → git.diff(['abc123', 'def456',
                                                                  '--', 'PrivilegedEAM/EntraId.json'])
                                                               → parse diff into structured change
                                                                 summary (added/removed objects,
                                                                 tier changes) using JSON-aware
                                                                 diff analysis
  ← render diff view (react-diff-viewer-continued)
```

---

## Large JSON File Handling Strategy

PrivilegedEAM files can be 10MB–500MB for large tenants. The strategy has three layers:

### Layer 1: Server-Side In-Memory Cache

```typescript
// server/src/lib/cache.ts
interface CacheEntry<T> {
  data: T;
  loadedAt: number;  // Date.now()
  fileModifiedAt: number;  // fs.statSync().mtimeMs
}

const cache = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 5 * 60 * 1000;  // 5 minutes

export async function getCached<T>(
  key: string,
  loader: () => Promise<T>,
  filePath: string
): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  const stat = await fs.stat(filePath).catch(() => null);
  const fileMtime = stat?.mtimeMs ?? 0;
  const isExpired = !entry || (Date.now() - entry.loadedAt > TTL_MS);
  const isStale = entry && entry.fileModifiedAt !== fileMtime;

  if (!entry || isExpired || isStale) {
    const data = await loader();
    cache.set(key, { data, loadedAt: Date.now(), fileModifiedAt: fileMtime });
    return data;
  }
  return entry.data;
}
```

**Rationale:** The cache holds parsed JSON objects, not raw strings. A 200MB JSON file parses to a JavaScript object tree of ~100–150MB heap. On a machine with 8GB RAM this is fine. Node.js handles `JSON.parse` of large strings via its C++ binding without blocking the event loop for files up to ~200MB. For very large tenants (>300MB files), fall back to streaming.

**Cache invalidation trigger:** After PowerShell command runner completes (`done` SSE event), the frontend calls `queryClient.invalidateQueries({ queryKey: ['eam'] })`, which re-fetches. The Express cache detects file mtime changed and reloads.

### Layer 2: Server-Side Pagination

All EAM object list endpoints apply filtering and pagination **before** serializing the response. The browser never receives the full dataset:

```
GET /api/eam/objects?tier=0&rbac=EntraId&page=1&pageSize=50&search=admin
```

Response:
```json
{
  "objects": [...50 objects...],
  "total": 342,
  "page": 1,
  "pageSize": 50
}
```

TanStack Query + TanStack Table are configured for **server-side pagination** (not client-side). The table never holds more than one page of objects in the browser.

### Layer 3: Streaming Fallback (>300MB files)

For tenants where a single RBAC system JSON exceeds ~300MB, use `stream-json` (npm pkg) to stream array elements without loading the full document into memory. This is an opt-in path detected by file size check on first load:

```typescript
const stat = await fs.stat(filePath);
if (stat.size > 300 * 1024 * 1024) {
  return streamParseEamFile(filePath);  // uses stream-json
} else {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}
```

**Build implication:** Implement the simple `fs.readFile` + `JSON.parse` path first. Add streaming fallback as a hardening step. Most tenants will never hit the 300MB threshold in Phase 1.

---

## Vite Proxy Configuration

During development, the Vite dev server (`:5173`) proxies all `/api` requests to the Express server (`:3001`). No CORS headers are needed on Express because the proxy makes the request appear same-origin from the browser's perspective.

```typescript
// gui/client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Do NOT rewrite path — Express routes start with /api
      },
    },
  },
  resolve: {
    alias: {
      // Allow client to import from shared/ without ../../ traversal
      '@shared': '/Users/nathanhutchinson/Dev/EntraOps/gui/shared',
    },
  },
})
```

**SSE proxy note:** The Vite proxy supports SSE (HTTP streaming) transparently — no special configuration needed. The proxy does NOT use WebSocket for SSE; SSE runs over plain HTTP chunked transfer encoding which http-proxy-3 handles correctly.

**Production build:** `vite build` produces static assets in `gui/client/dist/`. Express in production mode serves these static files from that directory. No Vite proxy needed:

```typescript
// server/src/index.ts — production mode
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}
```

---

## Backend API Route Design: REST (not tRPC)

**Decision: Plain REST with Zod-validated bodies. Do not use tRPC.**

| Factor | REST | tRPC |
|--------|------|------|
| Setup complexity | Low | Medium (adapter, provider, router) |
| Type safety | Manual (shared types in `shared/`) | Automatic (inferred) |
| Team cost | Zero (any dev knows REST) | Learning curve |
| SSE streaming | Native (res.write) | Requires subscription adapter |
| HTTP tool testing | curl / Postman | Requires tRPC client |
| Appropriate for 15 endpoints | ✅ | Overkill |

tRPC's main benefit (end-to-end type inference) is achieved here via `shared/types/api.ts` typed request/response shapes that both the API client and Express route handlers import. The discipline of sharing types via `shared/` gives ~80% of tRPC's type-safety benefit without the overhead.

### Route Inventory

| Method | Path | Purpose | Phase |
|--------|------|---------|-------|
| GET | `/api/eam/summary` | KPI aggregation (tier counts, RBAC breakdown, PIM types) | 1 |
| GET | `/api/eam/objects` | Paginated + filtered object list | 1 |
| GET | `/api/eam/objects/:id` | Single object detail | 1 |
| GET | `/api/eam/freshness` | File mtimes for all PrivilegedEAM/ JSONs | 1 |
| GET | `/api/templates` | List all template file names | 2 |
| GET | `/api/templates/:system` | Full template file content | 2 |
| PUT | `/api/templates/:system` | Write validated template update | 2 |
| GET | `/api/globals` | Global.json exclusion list | 2 |
| PUT | `/api/globals` | Write validated Global.json update | 2 |
| GET | `/api/git/commits` | Recent commits touching PrivilegedEAM/ | 1 |
| GET | `/api/git/diff` | Structured diff between two commits | 4 |
| POST | `/api/run` | Spawn PowerShell cmdlet, return SSE stream | 3 |
| DELETE | `/api/run` | Kill current running process | 3 |
| GET | `/api/config` | EntraOpsConfig.json content | 5 |
| PUT | `/api/config` | Write validated config update | 5 |

---

## State Management Architecture

Two distinct state concerns, two distinct tools:

### Server State: TanStack Query

All data that comes from the Express API (EAM objects, templates, git history) is server state. TanStack Query owns this completely:

```typescript
// Stable query keys — invalidated after command runner completes
const eamKeys = {
  all: ['eam'] as const,
  summary: () => [...eamKeys.all, 'summary'] as const,
  objects: (filters: FilterState) => [...eamKeys.all, 'objects', filters] as const,
  object: (id: string) => [...eamKeys.all, 'object', id] as const,
};

// staleTime: Infinity is correct for file-backed data
// Files don't change unless a PowerShell run completes
useQuery({
  queryKey: eamKeys.summary(),
  queryFn: () => apiClient.get('/api/eam/summary'),
  staleTime: Infinity,   // never re-fetch on window focus
  gcTime: 10 * 60_000,  // keep in cache 10 min
})
```

### Local UI State: Zustand

Filter state, panel visibility, command runner status, and tab selections are local UI state that do not need TanStack Query:

```typescript
// store/useFilterStore.ts
interface FilterState {
  tiers: (0 | 1 | 2)[];
  rbacSystems: string[];
  objectTypes: string[];
  pimType: 'all' | 'Permanent' | 'Eligible';
  search: string;
  page: number;
  pageSize: 50 | 100 | 200;
}

// URL sync: filter state is ALSO written to URL search params for bookmarkability
// The Zustand store is the authoritative source; React Router's useSearchParams
// is initialized from and synced to the store on mount.
```

**React context is NOT used for global state.** Context re-renders the entire tree on every change. With a data-dense table page and filter controls, this causes measurable jank. Zustand's selector model allows precise re-renders.

---

## Cross-Platform Considerations

### Path Resolution

The Express backend resolves all paths relative to the repository root, **never the CWD**:

```typescript
// server/src/lib/paths.ts
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// gui/server/src/lib/paths.ts → go up 4 levels to reach repo root
const REPO_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '..', '..', '..', '..', '..'
);

export const PATHS = {
  privilegedEam: (system: string) =>
    path.join(REPO_ROOT, 'PrivilegedEAM', `${system}.json`),
  classificationTemplate: (name: string) =>
    path.join(REPO_ROOT, 'Classification', 'Templates', `Classification_${name}.json`),
  globalJson: path.join(REPO_ROOT, 'Classification', 'Global.json'),
  entraOpsConfig: path.join(REPO_ROOT, 'EntraOpsConfig.json'),
  repoRoot: REPO_ROOT,
};
```

`path.join` normalises separators on all platforms (Windows uses `\`, POSIX uses `/`). Never use string concatenation with `/` for paths.

### PowerShell Invocation (Phase 3)

```typescript
// server/src/services/RunnerService.ts
export function getPwshExecutable(): string {
  // 'pwsh' resolves on macOS/Linux; on Windows, PATH includes pwsh.exe
  // child_process.spawn will find it via PATH on all platforms
  return 'pwsh';
}

// DO NOT use shell: true — it enables shell injection
// Pass arguments as an array
const proc = spawn(getPwshExecutable(), [
  '-NonInteractive',
  '-NoProfile',
  '-Command',
  buildSafeCommandString(allowedCmdlet, validatedParams),
], {
  cwd: PATHS.repoRoot,
  shell: false,  // CRITICAL: never true
  env: { ...process.env },
});
```

**On Windows** `pwsh` is the `pwsh.exe` executable distributed with PowerShell 7+. `child_process.spawn('pwsh', ...)` with `shell: false` works correctly on Windows because Node.js appends `.exe` via the PATH lookup on Win32.

### Atomic File Writes

Writing JSON files on Windows requires atomic rename because Windows does not allow renaming over an open file handle when another process is reading it. Use a write-to-temp-then-rename pattern:

```typescript
async function atomicWriteJson(targetPath: string, data: unknown): Promise<void> {
  const tmp = targetPath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, targetPath);  // atomic on POSIX; best-effort on Windows
}
```

---

## `package.json` Scripts Structure

```json
// gui/package.json
{
  "scripts": {
    "dev": "concurrently -k -n CLIENT,SERVER -c cyan,green \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "vite --config client/vite.config.ts",
    "dev:server": "nodemon --watch server/src --ext ts --exec tsx server/src/index.ts",
    "build": "npm run build:server && npm run build:client",
    "build:client": "vite build --config client/vite.config.ts",
    "build:server": "tsc -p server/tsconfig.json",
    "preview": "NODE_ENV=production node server/dist/index.js"
  }
}
```

Users run `npm run dev` from `gui/`. The `concurrently` `-k` flag kills both processes when either exits. Colors (`-c cyan,green`) and prefixes (`-n CLIENT,SERVER`) make the interleaved output readable.

---

## TypeScript Configuration

Three `tsconfig.json` files with a base + overrides pattern:

```
gui/tsconfig.json          ← base: strict, paths for @shared alias
gui/client/tsconfig.json   ← extends base; adds DOM lib; includes vite/client types
gui/server/tsconfig.json   ← extends base; no DOM lib; module: NodeNext; outDir: dist/
```

The `shared/` directory is compiled by both the client (bundled by Vite) and server (compiled by tsc). No separate compilation step for `shared/` — it is always compiled as part of its consumer.

---

## Build Order (Blocking Dependencies)

```
Phase 1 build order:
─────────────────────────────────────────────────────────────────────
[ MUST BE FIRST ]
  1. shared/types/eam.ts
     → Blocks: all hooks, all server routes, API client
     → Why: Every other component depends on knowing the EAM object shape

  2. server/src/lib/paths.ts
     → Blocks: all server services
     → Why: Services cannot resolve files without paths

─────────────────────────────────────────────────────────────────────
[ WAVE 2 — can be built in parallel once Wave 1 exists ]
  3a. server/src/services/EamFileService.ts (JSON read + cache)
  3b. shared/types/api.ts (request/response envelopes)
  3c. client/src/lib/apiClient.ts (typed fetch wrapper)

─────────────────────────────────────────────────────────────────────
[ WAVE 3 — after Wave 2 ]
  4a. server/src/routes/eam.ts (mount EamFileService onto Express)
  4b. client/src/hooks/useEamSummary.ts + useEamObjects.ts

─────────────────────────────────────────────────────────────────────
[ WAVE 4 — after Wave 3, any order ]
  5a. client/src/pages/DashboardPage.tsx (consumes useEamSummary)
  5b. client/src/pages/BrowserPage.tsx (consumes useEamObjects)
  5c. client/src/store/useFilterStore.ts (local filter state)
  5d. server/src/routes/git.ts (uses simple-git, no shared type dependency)

─────────────────────────────────────────────────────────────────────
[ WAVE 5 — integration ]
  6. AppShell, routing, layout components, empty states

Phase 2 build order:
─────────────────────────────────────────────────────────────────────
  1. shared/types/templates.ts → schema shapes
  2. server/src/services/TemplateService.ts (Zod schemas + file write)
  3. server/src/routes/templates.ts
  4. client/src/hooks/useTemplates.ts
  5. client/src/pages/TemplatesPage.tsx

Phase 3 build order:
─────────────────────────────────────────────────────────────────────
  1. shared/types/runner.ts → allowlist type, parameter shapes
  2. server/src/services/RunnerService.ts (spawn + SSE)
  3. server/src/routes/runner.ts
  4. client/src/store/useRunnerStore.ts (SSE connection state)
  5. client/src/pages/RunnerPage.tsx (EventSource + ansi-to-html)
```

**The single most blocking dependency across the entire project is `shared/types/eam.ts`.** It must be designed carefully upfront because changing it later requires touching hooks, routes, and components simultaneously.

---

## Security Boundaries

| Boundary | Mechanism | Notes |
|----------|-----------|-------|
| File write validation | Zod parse before `fs.writeFile` | Schema derived from actual Classification JSON structure |
| PowerShell command allowlist | Server-side Set lookup, not client-enforced | ALLOWLIST is const in RunnerService; client UI reflects it, never controls it |
| Path traversal prevention | All paths resolved via `PATHS.*` constants; reject any path containing `..` from user input | Never construct file paths from user-supplied strings directly |
| No `shell: true` on spawn | `child_process.spawn` with `shell: false` | Prevents command injection via PowerShell parameter values |
| SSE process singleton | RunnerService tracks one `activeProcess`; second POST returns 409 | Prevents concurrent PowerShell runs |
| Local-only binding | Express listens on `127.0.0.1` not `0.0.0.0` | Tool is local-only; should never be accessible on LAN |

---

## Patterns to Follow

### Pattern: Route → Service boundary

Routes handle HTTP concerns (parsing req, sending res, HTTP status codes). Services handle domain logic. Routes never touch `fs` directly:

```typescript
// routes/eam.ts — CORRECT
router.get('/summary', async (req, res) => {
  const summary = await eamFileService.getSummary();  // service does I/O
  res.json(summary);
});

// routes/eam.ts — WRONG (leaks I/O into route)
router.get('/summary', async (req, res) => {
  const raw = await fs.readFile('...', 'utf8');  // NO — belongs in service
  res.json(JSON.parse(raw));
});
```

### Pattern: Query key factory

Use a factory object (not inline arrays) for TanStack Query keys. This ensures consistent invalidation patterns and avoids keying bugs:

```typescript
// All eam-related keys in one place
export const eamKeys = {
  all: ['eam'] as const,
  summary: () => [...eamKeys.all, 'summary'] as const,
  objects: (f: FilterState) => [...eamKeys.all, 'objects', f] as const,
};

// After runner completes:
queryClient.invalidateQueries({ queryKey: eamKeys.all });
// This invalidates summary AND objects in one call
```

### Pattern: Empty state before data state

Every data-dependent component renders an explicit empty state before attempting to access data. The dashboard must gracefully handle a fresh fork with no `PrivilegedEAM/` files:

```typescript
// EamFileService.getSummary()
const files = await glob(PATHS.privilegedEam('*'));
if (files.length === 0) {
  return { empty: true, reason: 'no-data' };
}
```

The frontend checks `summary.empty` and renders a setup guide instead of the KPI cards.

---

## Anti-Patterns to Avoid

### ❌ Serving PrivilegedEAM/ files as static assets

Never serve the raw JSON files directly from Express (`express.static` on the data directory). This would expose 100MB+ files to `GET /PrivilegedEAM/EntraId.json` with no filtering, pagination, or caching. All data access goes through the service layer.

### ❌ Fetching classification data from Microsoft Graph

The GUI is a local file reader. It does not call Microsoft Graph. No Azure SDK, no auth tokens, no network dependency. Any temptation to add "live data" calls breaks the offline-first design contract.

### ❌ Storing filter state in TanStack Query

Filter UI state (which checkboxes are ticked) is local state. Using `useQuery` to "cache" filter state is a misuse of the library and causes cache pollution. Use Zustand for filters; use TanStack Query for data.

### ❌ Using `exec` instead of `spawn` for PowerShell

`child_process.exec` buffers all stdout until process exit — unsuitable for streaming. `exec` also uses a shell by default (injection risk). Always use `spawn` with `shell: false`.

### ❌ Single-file Express server

Putting all 15 routes in one `index.ts` file is a common pattern in tutorials that becomes unmaintainable. Use `express.Router()` per domain from day one.

---

## Scalability Considerations

This is a local single-user tool. Scalability concerns are about large *data files*, not concurrent users.

| Concern | Small tenant (<1K objects) | Large tenant (10K+ objects) |
|---------|----------------------------|-----------------------------|
| File load time | <100ms | 2–8 seconds first load; caches after |
| Memory (server) | ~20MB parsed | ~100–500MB parsed |
| Filter/pagination | In-memory filter on loaded array | Same — filtering is fast on sorted arrays |
| Dashboard render | Instant | Instant — uses aggregated summary, not raw objects |
| Table render | Instant (50 items/page) | Instant — server pagination enforces page size |
| Diff computation (Phase 4) | Fast | Slow for large JSON diffs — use git's `--stat` first |

---

## Sources

- Vite 8 proxy documentation: https://vite.dev/config/server-options.html#server-proxy (VERIFIED, HIGH)
- Express 5 routing patterns: https://expressjs.com/en/guide/routing.html (VERIFIED, HIGH)
- Node.js 22 child_process.spawn API: https://nodejs.org/api/child_process.html#child_processspawncommand-args-options (HIGH, training knowledge verified)
- TanStack Query v5 query key patterns: https://tanstack.com/query/v5/docs/framework/react/guides/query-keys (HIGH)
- stream-json package for large JSON streaming: https://github.com/uhop/stream-json (MEDIUM — recommended in Node.js community for this use case)
- Zustand v5 store patterns: https://zustand.docs.pmnd.rs (HIGH)
- simple-git array-argument pattern (no shell injection): https://github.com/steveukx/git-js (HIGH)
- Server-Sent Events (SSE) in Node.js Express: W3C SSE spec + Node.js HTTP docs (HIGH)
