# Phase 8: Object Reclassification Screen - Research

**Researched:** 2026-03-27
**Domain:** React full-stack feature (Express route + React page + shadcn/ui inline edit)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Override persistence format:** `Classification/Overrides.json` — array of `{ ObjectId, OverrideTierLevelName }` objects. Identical pattern to `Classification/Global.json`. File created on first save if missing.
- **Valid tier values:** `"ControlPlane"`, `"ManagementPlane"`, `"UserAccess"` — validated with Zod before write.
- **Write mechanism:** `atomicWrite()` utility (temp → rename). Same as templates route.
- **Path safety:** `assertSafePath()` from existing middleware.
- **API design:** Two new endpoints only — `GET /api/overrides` and `POST /api/overrides`. Reuse existing `/api/objects` for the object list.
- **`GET /api/overrides`:** Returns `{ overrides: [] }` if file missing (no error).
- **`POST /api/overrides`:** Accepts `{ overrides: Override[] }`, Zod-validates, atomicWrites. Returns 400 on invalid payload. No partial-update endpoint — always POST full array.
- **Override type:** `interface Override { ObjectId: string; OverrideTierLevelName: 'ControlPlane' | 'ManagementPlane' | 'UserAccess' }` — add to `shared/types/api.ts`.
- **Inline control:** shadcn `Select` per row. Options: Control Plane / Management Plane / User Access / — (No override). Amber row background (`bg-amber-500/10`) for pending (unsaved) rows.
- **Pending state:** React `useState` as `Map<ObjectId, OverrideTierLevelName | null>` — `null` means clear existing override.
- **Action bar:** Sticky header with "Save All (N)" (primary) and "Discard" (ghost) buttons, enabled only when pending count > 0.
- **Save semantics:** Merge pending + persisted overrides (remove null entries), POST full array, then invalidate overrides fetch state.
- **Discard:** Reset pending Map to empty without a server call.
- **Column layout:** Object | Applied Tier | Computed Tier | Override (Select).
- **Computed tier source:** `computedTierName()` from `shared/utils/tier.ts` — client-side, no new logic.
- **Applied tier badge:** Solid (same as Object Browser). Computed tier badge: dashed outline (Phase 7 asset).
- **Overrides are display-layer only** — they do NOT feed into the PowerShell classification engine.
- **Stale overrides (ObjectId no longer in any EAM file):** Silently ignored — not shown, not errored, kept in Overrides.json.
- **Nav route:** `/reclassify`. Nav label: "Reclassify". Icon: `SlidersHorizontal` (lucide-react). Position in sidebar: between "Browse Objects" and "Templates".
- **New files:** `server/routes/overrides.ts`, `client/src/pages/ReclassifyPage.tsx`, `client/src/hooks/useOverrides.ts`.

### Claude's Discretion

None specified — all implementation decisions are locked by CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- Feeding overrides into the EntraOps PowerShell classification engine — post-v1.1 PowerShell module work.
- Filtering the reclassification list by "has override" / "applied ≠ computed" — D1, deferred.
- Bulk-select and apply tier to multiple objects at once — D2, deferred.
- Warning toast when a loaded Overrides.json contains stale ObjectIds — D3, deferred.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RECL-01 | User can navigate to an Object Reclassification screen listing all objects with their applied and computed tiers | Nav route + sidebar entry + `ReclassifyPage.tsx` reading `/api/objects` |
| RECL-02 | User can select an override tier for an individual object inline | `select.tsx` (Wave 0 gap) + inline Select per row pre-populated from `useOverrides` |
| RECL-03 | Pending overrides are tracked visually before save | `Map<ObjectId, string\|null>` in `useState`; amber row highlight when pending ≠ persisted |
| RECL-04 | User can save overrides — changes persist to classification config files | `POST /api/overrides` → Zod validate → `atomicWrite(OVERRIDES_PATH, ...)` |
| RECL-05 | User can discard unsaved override selections | "Discard" button resets pending Map to `new Map()` |
</phase_requirements>

---

## Summary

Phase 8 adds a dedicated reclassification screen to the EntraOps GUI. The implementation is a standard "inline edit table → save to file" flow using the project's established patterns. All server-side infrastructure (atomicWrite, assertSafePath, Zod v4, Express Router) is already in place and must be reused.

The most significant pre-work item is an uninstalled UI component: **the shadcn/ui `Select` component does not exist in `client/src/components/ui/`**. It must be scaffolded in Wave 0 using the same `radix-ui` import pattern used by all other UI components. The `radix-ui` package (v1.4.x — the unified re-export package) is already installed and includes the Select primitive.

The project uses raw `useEffect` + `useState` data hooks throughout — **TanStack Query is not installed** despite the additional_context mentioning it. `useOverrides.ts` must follow the same pattern as `useObjects.ts` and `useCommits.ts`.

**Primary recommendation:** Wave 0 = scaffold `select.tsx` + create shared `Override` type. Wave 1 = server route. Wave 2 = hook + page + nav wiring.

---

## Standard Stack

### Core (verified from `gui/client/package.json` and `gui/server/package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.0 | UI rendering | Project baseline |
| TypeScript | 6.0 | Type safety | Project baseline |
| Vite | 8.0 | Dev/build tooling | Project baseline |
| Tailwind CSS | 4.2 (v4) | Utility CSS | Project baseline — CSS-first `@theme` config, not `tailwind.config.js` |
| radix-ui | 1.4 | Headless UI primitives (unified package) | Used by all shadcn/ui components in this project |
| TanStack Table | 8.21 | Table rendering | Already used in `ObjectTable.tsx` |
| React Router | 7.13 | Client routing | Project baseline |
| Express | 5.2 | HTTP server | Project baseline |
| Zod | 4.3 | Request validation | Project baseline — Zod v4, `error:` not `message:` |
| lucide-react | 1.6 | Icons | Project baseline — `SlidersHorizontal` available |
| sonner | 2.0 | Toast notifications | Already in `App.tsx` via `<Toaster />` |

### Reused Project Utilities (no new installs needed)

| Utility | Location | Purpose |
|---------|----------|---------|
| `computedTierName()` | `shared/utils/tier.ts` | Compute lowest privilege tier from Classification[] |
| `atomicWrite()` | `server/utils/atomicWrite.ts` | Safe file write via temp→rename |
| `assertSafePath()` | `server/middleware/security.ts` | Path traversal protection |
| `fetchApi<T>()` | `client/src/lib/api.ts` | GET fetch wrapper |
| `TIER_BADGE_CLASS` | `client/src/components/objects/ObjectTable.tsx` | Tier badge colour map |

### No New Installs Required

The `radix-ui` unified package already provides the Select primitive. No `@radix-ui/react-select` separate install needed.

---

## Architecture Patterns

### Recommended Project Structure

```
gui/
├── server/
│   ├── routes/
│   │   └── overrides.ts          # NEW — GET + POST /api/overrides
│   └── index.ts                   # MODIFIED — register overridesRouter
├── client/src/
│   ├── components/ui/
│   │   └── select.tsx             # NEW (Wave 0 gap — required by CONTEXT.md)
│   ├── hooks/
│   │   └── useOverrides.ts        # NEW — fetch GET + exec POST /api/overrides
│   └── pages/
│       └── ReclassifyPage.tsx     # NEW — the reclassification screen
└── shared/
    └── types/
        └── api.ts                 # MODIFIED — add Override interface
```

### Pattern 1: Express Router Registration

All routes follow this pattern — new overrides router must match exactly:

```typescript
// server/routes/overrides.ts
import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { assertSafePath } from '../middleware/security.js';
import { atomicWrite } from '../utils/atomicWrite.js';

const router = Router();
const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const CLASSIFICATION_BASE = path.join(REPO_ROOT, 'Classification');
const safeClassificationPath = assertSafePath(CLASSIFICATION_BASE);

// Zod v4 — note: error: (not message:) for custom validator strings
const OverrideSchema = z.object({
  ObjectId: z.string().min(1),
  OverrideTierLevelName: z.enum(['ControlPlane', 'ManagementPlane', 'UserAccess']),
});
const OverridesBodySchema = z.object({
  overrides: z.array(OverrideSchema),
});

export { router as overridesRouter };
```

```typescript
// server/index.ts — add these two lines alongside existing route registrations:
import { overridesRouter } from './routes/overrides.js';
// ...
app.use('/api/overrides', overridesRouter);
```

### Pattern 2: GET Endpoint — Return Empty Array When File Missing

```typescript
// Source: verified pattern from templates.ts GET /global
router.get('/', async (_req, res, next) => {
  try {
    let overrides: Override[] = [];
    try {
      const filePath = safeClassificationPath('Overrides.json');
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = z.array(OverrideSchema).safeParse(JSON.parse(raw));
      if (parsed.success) overrides = parsed.data;
    } catch {
      // File missing or invalid JSON — return empty, no error
    }
    res.json({ overrides });
  } catch (err) {
    next(err);
  }
});
```

### Pattern 3: POST Endpoint — Zod Validate + atomicWrite

```typescript
// Source: verified from templates.ts PUT pattern (atomicWrite utility)
router.post('/', async (req, res, next) => {
  try {
    const parsed = OverridesBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const filePath = safeClassificationPath('Overrides.json');
    await atomicWrite(filePath, JSON.stringify(parsed.data.overrides, null, 2));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
```

### Pattern 4: Data Hook — useEffect + useState (NOT TanStack Query)

```typescript
// Source: verified from useObjects.ts and useCommits.ts patterns
// useOverrides.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import type { Override, OverridesResponse } from '../../../shared/types/api';

export function useOverrides() {
  const [data, setData] = useState<Override[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchApi<{ overrides: Override[] }>('/api/overrides')
      .then(d => { if (!cancelled) { setData(d.overrides); setIsLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const invalidate = useCallback(() => setRefreshKey(k => k + 1), []);

  return { data, isLoading, error, invalidate };
}
```

**Note on `refreshKey`:** After a successful POST save, call `invalidate()` to re-fetch overrides from the server. This mirrors the "savedAt" state toggle pattern used in templates.

### Pattern 5: POST from Client — Raw fetch (Not fetchApi)

`fetchApi` is GET-only (no options parameter). Mutations use raw `fetch()` directly:

```typescript
// Source: verified from GlobalExclusionsTab.tsx onConfirm pattern
const res = await fetch('/api/overrides', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ overrides: mergedOverrides }),
});
if (!res.ok) {
  const err = await res.json() as { error: unknown };
  // handle error
  return;
}
invalidate(); // trigger useOverrides re-fetch
```

### Pattern 6: Pending State — Map in useState

```typescript
// Pending overrides: null means "clear this override"
const [pending, setPending] = useState<Map<string, string | null>>(new Map());

// On select change for an object row:
function handleOverrideChange(objectId: string, value: string | null) {
  setPending(prev => {
    const next = new Map(prev);
    next.set(objectId, value);
    return next;
  });
}

// Compute effective override for a row (pending takes precedence over persisted):
function getEffectiveOverride(objectId: string, persisted: Override[]): string | null {
  if (pending.has(objectId)) return pending.get(objectId) ?? null;
  return persisted.find(o => o.ObjectId === objectId)?.OverrideTierLevelName ?? null;
}

// Row is "dirty" (amber highlight) when pending differs from persisted:
function isDirty(objectId: string, persisted: Override[]): boolean {
  if (!pending.has(objectId)) return false;
  const pendingVal = pending.get(objectId) ?? null;
  const persistedVal = persisted.find(o => o.ObjectId === objectId)?.OverrideTierLevelName ?? null;
  return pendingVal !== persistedVal;
}

// Pending count (for "Save All (N)" label):
const pendingCount = [...pending.entries()].filter(([id, val]) => {
  const persistedVal = persistedOverrides.find(o => o.ObjectId === id)?.OverrideTierLevelName ?? null;
  return val !== persistedVal;
}).length;

// Build merged overrides array for POST (remove null/clear entries):
function buildSavePayload(pending: Map<string, string | null>, persisted: Override[]): Override[] {
  const merged = new Map<string, string>(persisted.map(o => [o.ObjectId, o.OverrideTierLevelName]));
  for (const [id, val] of pending) {
    if (val === null) merged.delete(id);
    else merged.set(id, val);
  }
  return [...merged.entries()].map(([ObjectId, OverrideTierLevelName]) => ({
    ObjectId,
    OverrideTierLevelName: OverrideTierLevelName as Override['OverrideTierLevelName'],
  }));
}
```

### Pattern 7: shadcn/ui Select Component (radix-ui)

No `select.tsx` exists — must be scaffolded in Wave 0. Use the same pattern as all other UI components:

```typescript
// Source: verified from accordion.tsx import pattern
import { Select as SelectPrimitive } from "radix-ui"
// Compose: SelectPrimitive.Root, SelectPrimitive.Trigger,
// SelectPrimitive.Content, SelectPrimitive.Item, SelectPrimitive.Value, etc.
```

The standard shadcn/ui Select component wraps these primitives. Follow the exact same composition style as `accordion.tsx`.

### Pattern 8: Sidebar Nav Item Addition

`NAV_ITEMS` in `Sidebar.tsx` is declared `as const`. Add the new item between the Objects entry and the Templates entry:

```typescript
// client/src/components/layout/Sidebar.tsx
import { LayoutDashboard, Users, SlidersHorizontal, FileJson, Terminal, PlugZap, PanelLeftClose, PanelLeftOpen, History, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/objects', icon: Users, label: 'Browse Objects', end: false },
  { to: '/reclassify', icon: SlidersHorizontal, label: 'Reclassify', end: false }, // NEW
  { to: '/templates', icon: FileJson, label: 'Templates', end: false },
  // ...rest unchanged
] as const;
```

### Pattern 9: Route Addition in App.tsx

```typescript
// client/src/App.tsx — add import + Route
import { ReclassifyPage } from '@/pages/ReclassifyPage';
// In JSX:
<Route path="reclassify" element={<ReclassifyPage />} />
// Position: after objects/:objectId, before templates
```

### Anti-Patterns to Avoid

- **Using TanStack Query:** Not installed. Use `useEffect` + `useState` per project convention.
- **Building a partial-update PATCH endpoint:** CONTEXT.md specifies full-array POST only.
- **Rendering the overrides file path from user input:** Path is always the static constant `OVERRIDES_PATH` — no user-controlled file path segment.
- **Showing a "stale override" warning:** Stale overrides are silently ignored per CONTEXT.md.
- **Per-row Save buttons:** Single "Save All" + "Discard" action bar only.
- **Pruning stale overrides server-side on GET:** Server returns all stored overrides; client filters by matching ObjectId.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Safe file writes | Custom write logic | `atomicWrite()` from `server/utils/atomicWrite.ts` | Crash-safe temp→rename pattern already solved |
| Path traversal protection | Manual path checks | `assertSafePath()` from `server/middleware/security.ts` | Already handles `path.sep` edge cases |
| Tier computation | Custom priority logic | `computedTierName()` from `shared/utils/tier.ts` | Phase 7 utility already handles Classification[] priority correctly |
| Tier badge colours | Inline colour logic | `TIER_BADGE_CLASS` map from `ObjectTable.tsx` | Single source of truth — dashed variant already there from Phase 7 |
| Dropdown overlays | Custom `<select>` | `select.tsx` scaffolded from `radix-ui` Select primitive | Handles portal, keyboard nav, focus management, ARIA |
| JSON payload validation | Manual type checks | Zod v4 schema (`OverrideSchema`) | Consistent with all other routes in the project |
| Pending count display | Complex derived state | Filter Map entries against persisted for dirty count | Simple Map iteration — no library needed |

---

## Common Pitfalls

### Pitfall 1: `select.tsx` Does Not Exist

**What goes wrong:** Planner assumes the shadcn `Select` component is available (CONTEXT.md references it), imports it, and the build fails.

**Why it happens:** `select.tsx` is not scaffolded — only 20 UI components exist in `components/ui/`, and Select is not one of them.

**How to avoid:** Wave 0 must create `client/src/components/ui/select.tsx` using `import { Select as SelectPrimitive } from "radix-ui"` and compose `Root`, `Trigger`, `Content`, `Item`, `Value`, `Viewport`, `ScrollUpButton`, `ScrollDownButton`, `ItemText`, `ItemIndicator` sub-components in the standard shadcn/ui style. The `radix-ui` unified package (v1.4.x) is already installed and includes Select.

**Warning signs:** TypeScript error on `import { Select } from '@/components/ui/select'`.

### Pitfall 2: Zod v4 `message:` vs `error:` Syntax

**What goes wrong:** Schema validation silently uses wrong error format; Zod v4 ignores `message:` (it's a v3 API) and uses a default message.

**Why it happens:** Most Zod documentation (and Claude training data) covers Zod v3 (`z.string().min(1, { message: '...' })`). Zod v4 uses `error:`.

**How to avoid:** In all route schemas use `error:`: `z.string().min(1, { error: 'ObjectId required' })`. Check `package.json` — it's `zod: "^4.3.6"`.

### Pitfall 3: TanStack Query Not Installed

**What goes wrong:** Planner writes `useQuery` / `useMutation` from `@tanstack/react-query` — import fails at build time.

**Why it happens:** The `additional_context` erroneously listed TanStack Query as part of the stack. Only `@tanstack/react-table` is installed.

**How to avoid:** Use the `useEffect` + `useState` + `refreshKey` hook pattern. Confirmed: no `@tanstack/react-query` in any `package.json`.

### Pitfall 4: `fetchApi` Cannot POST

**What goes wrong:** `fetchApi('/api/overrides', { method: 'POST', body: ... })` — TypeScript error because `fetchApi` has signature `fetchApi<T>(path: string): Promise<T>` — no second argument.

**Why it happens:** `lib/api.ts` is a minimal GET-only wrapper. No PUT/POST/PATCH variant exists.

**How to avoid:** Use raw `fetch()` with explicit options for the POST save call. Do NOT modify `fetchApi` to add options — follow the existing precedent (see `GlobalExclusionsTab.tsx`, `ConnectPage.tsx`).

### Pitfall 5: `as const` on NAV_ITEMS Breaks Type Inference

**What goes wrong:** TypeScript error when adding `SlidersHorizontal` if the import isn't updated.

**Why it happens:** `Sidebar.tsx` currently imports only specific icons. `SlidersHorizontal` must be added to the import list from `lucide-react`.

**How to avoid:** Add `SlidersHorizontal` to the lucide-react import alongside existing icons. The icon is available in lucide-react 1.6.0 (confirmed in package.json).

### Pitfall 6: atomicWrite Directory Must Exist

**What goes wrong:** `atomicWrite(OVERRIDES_PATH, ...)` fails with ENOENT if `Classification/` directory doesn't exist on a fresh repo.

**Why it happens:** `atomicWrite` uses `fs.writeFile` → `fs.rename` — neither creates parent directories.

**How to avoid:** Add `await fs.mkdir(CLASSIFICATION_BASE, { recursive: true })` before `atomicWrite` in the POST handler. In practice on any tenant that has run `Save-EntraOpsPrivilegedEAMJson`, the Classification dir will exist (Global.json lives there) — but the mkdir guard is cheap insurance.

### Pitfall 7: Pending Map Mutation (Direct Mutation)

**What goes wrong:** `pending.set(objectId, value)` mutates the existing Map → React doesn't detect the state change → row highlights don't update.

**Why it happens:** Maps (like objects) are reference types. React only re-renders on new references.

**How to avoid:** Always create a new Map: `const next = new Map(prev); next.set(id, val); return next;` inside the `setState` updater function.

### Pitfall 8: Select "No override" Value Representation

**What goes wrong:** Using `undefined` or omitting the value as the "clear override" option — breaks controlled Select component state.

**How to avoid:** Use empty string `""` as the sentinel value for "— No override" in the Select component. In `handleOverrideChange`, map `""` → `null` in the pending Map (null = clear intent). On pre-population, map `null` pending or missing persisted → `""` for the Select value prop.

---

## Code Examples

### Server: Full overrides.ts Route File Pattern

```typescript
// server/routes/overrides.ts
import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { assertSafePath } from '../middleware/security.js';
import { atomicWrite } from '../utils/atomicWrite.js';
import type { Override } from '../../shared/types/api.js';

const router = Router();
const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const CLASSIFICATION_BASE = path.join(REPO_ROOT, 'Classification');
const safeClassificationPath = assertSafePath(CLASSIFICATION_BASE);

const OverrideSchema = z.object({
  ObjectId: z.string().min(1),
  OverrideTierLevelName: z.enum(['ControlPlane', 'ManagementPlane', 'UserAccess']),
});
const OverridesBodySchema = z.object({
  overrides: z.array(OverrideSchema),
});

router.get('/', async (_req, res, next) => {
  try {
    let overrides: Override[] = [];
    try {
      const filePath = safeClassificationPath('Overrides.json');
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = z.array(OverrideSchema).safeParse(JSON.parse(raw));
      if (parsed.success) overrides = parsed.data;
    } catch { /* file missing or invalid — return empty */ }
    res.json({ overrides });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = OverridesBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await fs.mkdir(CLASSIFICATION_BASE, { recursive: true });
    const filePath = safeClassificationPath('Overrides.json');
    await atomicWrite(filePath, JSON.stringify(parsed.data.overrides, null, 2));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export { router as overridesRouter };
```

### Shared Type Addition

```typescript
// shared/types/api.ts — add at end of file
export interface Override {
  ObjectId: string;
  OverrideTierLevelName: 'ControlPlane' | 'ManagementPlane' | 'UserAccess';
}

export interface OverridesResponse {
  overrides: Override[];
}
```

### Client: Row Amber Highlight

```typescript
// In ReclassifyPage.tsx — conditional row class
<TableRow
  key={obj.ObjectId}
  className={cn(
    isDirty(obj.ObjectId, persistedOverrides) && 'bg-amber-500/10'
  )}
>
```

### Client: Select Inline Override Control

```typescript
// In ReclassifyPage.tsx — per-row Select usage
<Select
  value={getEffectiveOverride(obj.ObjectId, persistedOverrides) ?? ''}
  onValueChange={(val) => handleOverrideChange(obj.ObjectId, val === '' ? null : val)}
>
  <SelectTrigger className="h-7 text-xs w-[160px]">
    <SelectValue placeholder="— No override" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">— No override</SelectItem>
    <SelectItem value="ControlPlane">Control Plane</SelectItem>
    <SelectItem value="ManagementPlane">Management Plane</SelectItem>
    <SelectItem value="UserAccess">User Access</SelectItem>
  </SelectContent>
</Select>
```

### Client: Action Bar with Pending Count

```typescript
// Sticky action bar at top of ReclassifyPage
{pendingCount > 0 && (
  <div className="sticky top-0 z-10 flex items-center gap-3 bg-background border-b border-border px-6 py-3">
    <Button onClick={handleSave} disabled={isSaving}>
      Save All ({pendingCount})
    </Button>
    <Button variant="ghost" onClick={handleDiscard} disabled={isSaving}>
      Discard
    </Button>
    {saveError && <p className="text-destructive text-sm">{saveError}</p>}
  </div>
)}
```

---

## Environment Availability

Step 2.6: SKIPPED — this phase adds code/config only. No external tools, services, CLIs, or runtimes beyond what is already running in the development environment are required.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Server framework | Vitest 4.1 + supertest 7.2 |
| Server config file | `gui/server/vitest.config.ts` |
| Server quick run | `cd gui/server && npx vitest run routes/overrides.test.ts` |
| Server full suite | `cd gui/server && npx vitest run` |
| Client framework | Vitest 4.1 + jsdom + @testing-library/react |
| Client config file | `gui/client/vite.config.ts` (`test` block) |
| Client tests | No new client tests needed (consistent with existing — only `cron.test.ts` exists) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECL-01 | Nav route `/reclassify` renders ReclassifyPage | manual (no page-level client tests in project) | — | N/A |
| RECL-02 | Inline Select per row pre-populated from persisted overrides | manual (browser) | — | N/A |
| RECL-03 | Amber row highlight for pending rows | manual (browser) | — | N/A |
| RECL-04 | `POST /api/overrides` writes `Overrides.json` atomically | unit/integration | `cd gui/server && npx vitest run` | ❌ Wave 0 |
| RECL-04 | `GET /api/overrides` returns `{ overrides: [] }` when file missing | unit/integration | `cd gui/server && npx vitest run` | ❌ Wave 0 |
| RECL-04 | `POST /api/overrides` returns 400 on invalid payload | unit/integration | `cd gui/server && npx vitest run` | ❌ Wave 0 |
| RECL-05 | Discard resets pending state without server call | manual (browser) | — | N/A |

### Sampling Rate

- **Per task commit:** `cd gui/server && npx vitest run routes/overrides.test.ts`
- **Per wave merge:** `cd gui/server && npx vitest run`
- **Phase gate:** Full server suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `gui/server/routes/overrides.test.ts` — covers RECL-04 GET and POST cases
- [ ] `gui/client/src/components/ui/select.tsx` — required by RECL-02; not a test file but a Wave 0 prerequisite

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `gui/server/routes/templates.ts` (atomicWrite + assertSafePath + Zod v4 patterns)
- Codebase direct inspection — `gui/server/routes/objects.ts` (Zod v4 QuerySchema, Express v5 Router pattern)
- Codebase direct inspection — `gui/client/src/hooks/useObjects.ts` (hook pattern — `useEffect` + `useState`)
- Codebase direct inspection — `gui/client/src/components/templates/GlobalExclusionsTab.tsx` (raw fetch POST pattern)
- Codebase direct inspection — `gui/client/src/components/ui/accordion.tsx` (radix-ui import pattern)
- Codebase direct inspection — `gui/client/package.json` (confirmed stack versions, confirmed NO `@tanstack/react-query`)
- Codebase direct inspection — `gui/client/src/components/ui/` directory listing (confirmed NO `select.tsx`)
- Codebase direct inspection — `gui/server/index.ts` (route registration pattern, Express v5 wildcard note)
- Codebase direct inspection — `gui/shared/utils/tier.ts` (`computedTierName()` signature)
- Codebase direct inspection — `gui/shared/types/api.ts` (existing `Override` type not present — confirmed gap)

### Secondary (MEDIUM confidence)

- radix-ui v1.4 unified package includes Select primitive — inferred from package pattern (all existing shadcn components import from `"radix-ui"` unified package; Select is part of the same Radix family)

---

## Metadata

**Confidence breakdown:**

- Standard Stack: HIGH — verified directly from package.json files
- Architecture patterns: HIGH — verified by reading existing route and hook implementations
- Critical gap (select.tsx missing): HIGH — verified by listing `components/ui/` directory
- Critical gap (TanStack Query not installed): HIGH — `grep @tanstack/react-query` returned no results
- Pitfalls: HIGH — derived from concrete code evidence (Zod v4, fetchApi signature, Map mutation)

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable dependencies, 30-day window)
