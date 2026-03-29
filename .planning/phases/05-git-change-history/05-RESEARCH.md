# Phase 5: Git Change History — Research

**Researched:** 2026-03-26
**Discovery Level:** 1 (Quick Verification — all dependencies installed, patterns established)

## Standard Stack

All dependencies are already installed and in use:

| Concern | Library | Version | Status |
|---------|---------|---------|--------|
| Git operations | `simple-git` | 3.33.0 | Installed, used in `gui/server/services/gitLog.ts` |
| Server framework | Express v5 | Latest | Running, routes in `gui/server/routes/` |
| Client framework | React 19 + React Router v7 | Latest | Running, pages in `gui/client/src/pages/` |
| URL state | `nuqs` | Installed | Used in ObjectBrowser for filter/pagination URL sync |
| Validation | Zod v4 | Installed | Used in `objects.ts` route for query params |
| UI components | shadcn/ui (new-york) | 11+ components | checkbox, tabs, table, badge, skeleton, button all available |
| Styling | Tailwind v4 (CSS-first) | Running | `@theme` inline, tier semantic colors defined |
| Diff rendering | `diff` package | Installed | Used by DiffDialog in Phase 2 for `diffLines()` |

**No new npm dependencies required.** Everything needed is in the workspace.

## Architecture Patterns

### 1. simple-git API for Phase 5 Operations

**Paginated commit listing** — `git.log()`:
```typescript
// LogOptions supports maxCount but NOT skip — use custom args for pagination
const log = await git.log({
  maxCount: pageSize,
  '--skip': page * pageSize,   // custom arg passed through
  '--': null,
  'PrivilegedEAM/': null,      // pathspec limits to PrivilegedEAM changes
} as Parameters<typeof git.log>[0]);
// Returns LogResult<DefaultLogFields> with .all[], .total, .latest
// DefaultLogFields: { hash, date, message, refs, body, author_name, author_email }
```

**Note:** `LogResult.total` reports the count of entries in the response, NOT the total count in the repo. To get total commit count for pagination, use a separate `git.raw()` call:
```typescript
const countOutput = await git.raw(['rev-list', '--count', 'HEAD', '--', 'PrivilegedEAM/']);
const totalCommits = parseInt(countOutput.trim(), 10);
```

**File content at a specific commit** — `git.show()`:
```typescript
// Get aggregate JSON at a specific commit
const content = await git.show([`${commitHash}:PrivilegedEAM/EntraID/EntraID.json`]);
// Returns raw string — parse with JSON.parse()
// Throws if file doesn't exist at that commit — catch and return null
```

**Raw diff between two commits** — `git.diff()`:
```typescript
// Unified diff for a specific file between two commits
const rawDiff = await git.diff([fromHash, toHash, '--', `PrivilegedEAM/${rbacSystem}/${rbacSystem}.json`]);
// Returns raw unified diff string
```

**List changed files in a commit** — `git.diffSummary()`:
```typescript
// Files changed in a specific commit (vs parent)
const summary = await git.diffSummary([`${hash}^`, hash, '--', 'PrivilegedEAM/']);
// Returns DiffResult { changed, files[], insertions, deletions }
// files[].file = relative path (e.g. "PrivilegedEAM/EntraID/EntraID.json")
```

**Which RBAC systems were affected** — derive from file paths:
```typescript
// Parse RBAC system from file path
const affectedSystems = new Set(
  summary.files
    .map(f => f.file.split('/')[1])  // "PrivilegedEAM/{System}/..."
    .filter(Boolean)
);
```

### 2. Structured Change Summary Algorithm

The core algorithm for HIST-02/HIST-03: comparing two JSON snapshots to identify added, removed, and tier-changed objects.

**Input:** Two arrays of `PrivilegedObject[]` (parsed from aggregate JSON at two commits)
**Output:** Per-RBAC-system structured change summary

```typescript
interface ObjectChange {
  objectId: string;
  objectDisplayName: string;
  objectType: string;
  changeType: 'added' | 'removed' | 'tierChanged';
  // Only for tierChanged:
  previousTier?: EamTier;
  currentTier?: EamTier;
  roleAssignmentDelta?: RoleAssignmentDelta[];
}

interface RoleAssignmentDelta {
  action: 'added' | 'removed';
  roleDefinitionName: string;
  tier: EamTier;
  roleSystem: string;
}

interface TierSectionChanges {
  tier: 'ControlPlane' | 'ManagementPlane' | 'UserAccess';
  added: ObjectChange[];
  removed: ObjectChange[];
  tierChanged: ObjectChange[];
}
```

**Algorithm (server-side):**
1. Load JSON at commit A (`parent`) and commit B (`current`) via `git.show()`
2. Index both arrays by `ObjectId` into `Map<string, PrivilegedObject>`
3. Walk current map:
   - If ObjectId not in parent → **added** (classify into current tier section)
   - If ObjectId in both but `ObjectAdminTierLevelName` differs → **tierChanged** (classify into current tier section)
4. Walk parent map:
   - If ObjectId not in current → **removed** (classify into parent tier section)
5. For tier-changed objects: diff `RoleAssignments` arrays:
   - Index by `RoleAssignmentId` in both snapshots
   - New assignments = those in current but not parent → `action: 'added'`
   - Removed assignments = those in parent but not current → `action: 'removed'`
   - Include `RoleDefinitionName` and the tier from `Classification[0].AdminTierLevelName`

**Performance consideration:** Each aggregate JSON can be large (hundreds of objects). The comparison is O(n) with hash maps — no concern. The expensive part is two `git.show()` calls per RBAC system. The endpoint should process **one RBAC system at a time** (requested by RBAC system tab), not all systems upfront.

### 3. Pagination Pattern (follows Object Browser)

The Object Browser already implements server-side pagination with nuqs URL state. Phase 5 follows the same pattern:

**Server:** Zod schema validates `page` + `pageSize` query params. Uses `--skip` and `--max-count` in git log.
**Client:** `nuqs` `parseAsInteger` for page state. `useQueryStates()` for URL reflection. Same prev/next pagination controls.

```typescript
// Server: GET /api/git/commits?page=1&pageSize=20&rbac[]=EntraID
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  rbac: coerceArray.optional(),  // reuse coerceArray from objects.ts
});
```

### 4. RBAC System Tabs Pattern (follows Template Editor)

The Templates page already implements RBAC system tabs with shadcn/ui `<Tabs>`. Phase 5 follows the same pattern for both the expanded commit view and comparison page.

Key difference: Template tabs are static (all 5 always shown). History tabs are **dynamic** — only systems with changes in that commit/range get a tab.

```typescript
// Dynamic tabs — only show systems that have changes
const affectedSystems = ['EntraID', 'ResourceApps']; // from diffSummary
<Tabs defaultValue={affectedSystems[0]}>
  <TabsList>
    {affectedSystems.map(sys => <TabsTrigger key={sys} value={sys}>{sys}</TabsTrigger>)}
  </TabsList>
  {affectedSystems.map(sys => (
    <TabsContent key={sys} value={sys}>
      <ChangeSummary system={sys} />
    </TabsContent>
  ))}
</Tabs>
```

### 5. Filter Chip Pattern (follows Object Browser)

The Object Browser uses multi-select filter chips from `ObjectFilters`. Phase 5 reuses the same pattern for the RBAC system filter above the commit list.

Client-side filtering: The commit list is fetched with metadata about which RBAC systems each commit touched. The RBAC filter chips hide/show rows without re-fetching.

### 6. Commit Comparison Route

A dedicated full-page route at `/history/compare?from={hash}&to={hash}`.

**URL-addressable:** The comparison page reads `from` and `to` from query params on load — no need for prior state. This makes it a sharable link.

**Navigation:** From the history list, checkboxes select 2 commits → click Compare → navigates to `/history/compare?from=abc1234&to=def5678`.

### 7. Raw Diff Rendering

The `diff` npm package is already installed (used in Phase 2 DiffDialog). For raw JSON diff display:

**Option A (recommended):** Reuse `diffLines()` from the `diff` package client-side, with the same green/red span rendering as DiffDialog. The raw diff is fetched as a string from the server and rendered in a `<pre>` block with syntax coloring.

**Option B:** Return the raw unified diff string from the server (from `git.diff()`) and render it directly in a `<pre>` block with line-by-line coloring based on `+`/`-` prefix.

**Decision: Option B** — the server already has the raw diff from `git.diff()`. Rendering unified diff output is simpler than re-diffing client-side. Use `<pre>` with line-by-line coloring: lines starting with `+` get `bg-green-950`, lines with `-` get `bg-red-950`, `@@` headers get `text-muted-foreground`.

## Don't Hand-Roll

| Need | Use This | Not This |
|------|----------|----------|
| Git log pagination | `simple-git` `git.log()` + `--skip` option | Manual `child_process` git spawning |
| File content at commit | `git.show(['hash:path'])` | Checkout + read + checkout back |
| Raw diff | `git.diff([hash1, hash2, '--', path])` | External diff library on two JSON strings |
| JSON object comparison | In-memory Map-based diff (server-side) | Text-based diff of JSON strings |
| URL state | `nuqs` (same as Object Browser) | Manual `useSearchParams` |
| RBAC system tabs | shadcn/ui `<Tabs>` (same as Templates) | Custom tab implementation |
| Pagination controls | Same component pattern as Object Browser | New pagination library |

## Common Pitfalls

### 1. git.show() Throws on Missing Files
**Problem:** `git.show(['hash:path/to/file.json'])` throws if the file doesn't exist at that commit (e.g., Defender directory is empty in early commits).
**Solution:** Wrap every `git.show()` in try/catch, return `null` or `[]` for missing files. The CONTEXT.md explicitly requires graceful handling: "Show 'No data for this system in this commit' rather than erroring."

### 2. Short Hash Resolution
**Problem:** The UI uses 7-char short hashes everywhere. `simple-git` methods accept both short and full hashes — `git.show()` and `git.diff()` resolve automatically.
**Solution:** No manual resolution needed. Store and pass short hashes throughout. Git resolves them internally.

### 3. Commit Count for Pagination
**Problem:** `LogResult.total` is the count of returned entries, NOT the total matching commits. Need total for page count display.
**Solution:** Separate `git.raw(['rev-list', '--count', 'HEAD', '--', 'PrivilegedEAM/'])` call to get true total. Cache this value (it only changes on new commits).

### 4. Large Aggregate JSON Files
**Problem:** Aggregate files can contain hundreds of objects. Two `git.show()` calls + JSON parse + Map comparison per RBAC system tab.
**Solution:** Process one RBAC system at a time (lazy load on tab click). The structured change summary endpoint takes a `rbacSystem` parameter. This is already the design in CONTEXT.md (tabs per changed RBAC system, load on click).

### 5. Commits with No PrivilegedEAM/ Changes
**Problem:** If listing all repo commits (not filtered to PrivilegedEAM/), some won't have relevant changes.
**Solution:** The `git.log()` pathspec `PrivilegedEAM/` already filters to only matching commits. But CONTEXT.md says "Commits with no `PrivilegedEAM/` changes still appear in the list" — this means we do NOT pathspec-filter the log. We list ALL commits, but only compute change summaries for those that actually touched PrivilegedEAM/.

**Wait — re-reading CONTEXT.md:** "Commits with no `PrivilegedEAM/` changes still appear in the list. A commit that touched only `Classification/` shows the commit metadata but its expanded section says 'No PrivilegedEAM/ changes in this commit.'"

This means the commit list should show ALL repo commits (not just PrivilegedEAM-touching ones). The pathspec determines which commits have expandable summaries vs. which show the "no changes" message. Server response should include a flag like `hasPrivilegedEAMChanges: boolean` per commit.

### 6. Comparison Between Non-Adjacent Commits
**Problem:** The structured diff must compare the file state at two arbitrary commits — not consecutive ones. This means comparing `git.show('hash1:file')` vs `git.show('hash2:file')`, not diffing a commit against its parent.
**Solution:** The comparison endpoint takes `from` and `to` hashes. It loads the file at each commit independently. This is different from the single-commit view which compares against the parent (`hash^`).

### 7. RBAC System Filter is Client-Side
**Problem:** CONTEXT.md specifies the RBAC filter on the history page is "a client-side filter on commit metadata (affected files), not a re-fetch."
**Solution:** The server returns which RBAC systems each commit affected (derived from `diffSummary` file paths). The client filters locally. This means the commit list API must include `affectedSystems: RbacSystem[]` per commit.

**But computing diffSummary for EVERY commit in the paginated list is expensive.** Each commit needs a `git diffSummary` call. For 20 commits per page, that's 20 git subprocess calls.

**Mitigation:** Use `git.raw(['diff-tree', '--no-commit-id', '--name-only', '-r', hash])` which is lighter than full diffSummary. Or use `git.log()` with `--name-only` format to include changed file names in the log output itself:

```typescript
const log = await git.log({
  maxCount: pageSize,
  '--skip': String((page - 1) * pageSize),
  '--name-only': null,  // includes changed file names in output
  '--': null,
  // NO pathspec — list all commits
} as any);
// But --name-only with custom format may not parse correctly in simple-git...
```

**Better approach:** Use `git.raw()` for the commit list to get both commit metadata and file names in one call:
```typescript
const output = await git.raw([
  'log',
  `--max-count=${pageSize}`,
  `--skip=${(page - 1) * pageSize}`,
  '--format=%H%n%h%n%an%n%aI%n%s',  // full hash, short hash, author, date, subject
  '--name-only',                      // append changed file names after each commit
]);
// Parse the output manually — each commit block separated by double newline
```

This avoids N+1 git calls and gets file paths in a single log command.

## Validation Architecture

### Critical Behaviors to Validate

1. **Commit list pagination** — correct page, correct count, forward/backward works
2. **Structured change summary accuracy** — added/removed/tierChanged correctly classified
3. **Tier change role assignment delta** — correct RoleAssignment diff identifying cause
4. **Comparison between arbitrary commits** — not just parent comparison
5. **RBAC system filter** — client-side filtering works correctly
6. **Empty states** — no PrivilegedEAM/ history, no changes in commit, missing aggregate files
7. **Short hash handling** — 7-char hashes work throughout the flow

### Test Strategy

**Unit tests (server):**
- Change summary diffing algorithm with mock JSON data
- Parsing git log output into structured commit objects
- RBAC system extraction from file paths

**Integration tests (API):**
- Commit list endpoint returns correct pagination metadata
- Commit detail endpoint returns structured changes
- Compare endpoint handles arbitrary commit pairs
- Graceful handling of missing files / empty systems

**Manual verification (checkpoint):**
- Visual check of commit list in browser
- Expand a commit → see structured changes with ControlPlane visually distinct
- Compare two commits → see structured summary + raw diff
- RBAC filter chips work, empty states display correctly

---

*Research completed: 2026-03-26*
*Phase: 05-git-change-history*
