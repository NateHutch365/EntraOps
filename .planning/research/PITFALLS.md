# Domain Pitfalls: EntraOps GUI

**Domain:** Local-first React + Express security dashboard (file system, git, PowerShell process spawning)
**Researched:** 2026-03-24
**Sources:** OWASP Top 10 (2021), Node.js child_process docs, TanStack Table v8 docs, Vite proxy docs, codebase analysis (CONCERNS.md)

---

## Critical Pitfalls — Security

These can cause data loss, privilege escalation, or remote code execution. Address in Phase 1 or Phase 3 before any user testing.

---

### PITFALL-S1: Shell Injection via PowerShell Invocation

**Category:** Security (OWASP A03: Injection)
**Phase to address:** Phase 3 (Command Runner)

**What goes wrong:**
Using `child_process.exec()` or string interpolation to build a shell command for PowerShell. Even with an allowlist, if parameters are assembled into a string and passed via `exec()` or `-Command "..."`, an attacker (or a malformed parameter value) can inject `; Remove-Item -Recurse` or similar.

```js
// DANGEROUS — never do this
exec(`pwsh -Command "${allowlistedCommand} -TenantId ${tenantId}"`)
```

**Why it happens:**
Developers use `exec()` because it's familiar and simple. The command string looks harmless until a parameter contains a semicolon, backtick, `$()`, or quote.

**Consequences:**
Arbitrary PowerShell execution on the local machine with the process owner's privileges. This is a local tool, so that means the security administrator's credentials and file system.

**Prevention:**
- Use `child_process.spawn()` with arguments as an **array** — never as a concatenated string
- Pass `-NonInteractive -NoProfile` flags to PowerShell to prevent profile-level injection
- Validate the command name against the allowlist with **exact equality** (`=== 'Save-EntraOpsPrivilegedEAMJson'`), not substring or regex match
- Validate each parameter value against a per-command schema (Zod) before passing to spawn
- Never pass user-controlled values via `-Command`; use named parameter arguments

```js
// SAFE
const proc = spawn('pwsh', [
  '-NonInteractive', '-NoProfile', '-Command',
  allowlistedCmd,      // validated by exact equality against ALLOWLIST set
  '-TenantId', validatedTenantId  // validated type: UUID only
])
```

**Warning signs:**
- Any `exec()`, `execSync()`, or `shell: true` in the process manager
- String template literals building `-Command "..."` arguments
- Parameters passed without per-command Zod schema validation

---

### PITFALL-S2: Path Traversal in File System API Endpoints

**Category:** Security (OWASP A01: Broken Access Control)
**Phase to address:** Phase 1 (data pipeline) and Phase 2 (template editor write path)

**What goes wrong:**
Express endpoints that accept a filename or path segment resolve user-supplied values without confirming the resolved path stays within the allowed directory.

```js
// DANGEROUS
app.get('/api/eam/:file', (req, res) => {
  const filePath = path.join(EAM_DIR, req.params.file)
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')))
})
// GET /api/eam/../../.env  →  reads .env
// GET /api/eam/../Classification/Templates/AadResources.json  →  reads outside EAM_DIR
```

`path.join()` does NOT prevent traversal — it resolves `../` cleanly.

**Why it happens:**
Developers assume `path.join` normalizes away traversal attempts. It normalizes the separators but resolves the traversal.

**Consequences:**
Read access to any file readable by the Node process (`.env`, SSH keys, PowerShell credential files). Write access to `Classification/Templates/` endpoints means arbitrary JSON overwrite.

**Prevention:**
After resolving, verify the resolved path **starts with** the allowed base directory:

```js
const BASE = path.resolve(process.cwd(), 'PrivilegedEAM')
function safePath(userInput: string): string {
  const resolved = path.resolve(BASE, userInput)
  if (!resolved.startsWith(BASE + path.sep)) {
    throw new Error('Path traversal attempt blocked')
  }
  return resolved
}
```

Apply this guard to **every** route that takes a path-like parameter. The template editor's write endpoint is higher risk than the read endpoints — double-check both.

**Warning signs:**
- `path.join(SOME_DIR, req.params.anything)` without a `startsWith` guard
- Any endpoint that takes a filename string and passes it to `fs` functions

---

### PITFALL-S3: Express Server Binding to 0.0.0.0 (Network Exposure)

**Category:** Security (OWASP A01: Broken Access Control — unintended exposure)
**Phase to address:** Phase 1 (server scaffold)

**What goes wrong:**
`app.listen(3001)` without an explicit host binds to `0.0.0.0` on most systems — all network interfaces. On a laptop connected to a corporate network or a shared Wi-Fi, the API becomes accessible to other machines on the network. Since there is no authentication, any host on the LAN can read classified identity data and trigger PowerShell commands.

Additionally, DNS rebinding attacks can exploit a localhost-only server via a malicious webpage that resolves a custom domain to `127.0.0.1`.

**Why it happens:**
Developers rarely think about binding host in local tools. Express defaults and tutorial examples never specify a host.

**Consequences:**
Full API access (including the command runner in Phase 3) from any host on the same network segment.

**Prevention:**
- Always bind explicitly to `127.0.0.1`:
  ```js
  app.listen(PORT, '127.0.0.1', () => { ... })
  ```
- Add a CORS policy allowing only `http://localhost:5173` and `http://127.0.0.1:5173` as origins — reject all others
- Add a `Host` header validation middleware that rejects requests where `Host` is not `localhost` or `127.0.0.1` (DNS rebinding mitigation)

**Warning signs:**
- `app.listen(PORT)` or `app.listen(PORT, callback)` with no host argument
- Missing CORS configuration or overly permissive `cors({ origin: '*' })`

---

### PITFALL-S4: Arbitrary File Write Without Schema Validation (Template Editor)

**Category:** Security (OWASP A03: Injection; Data Integrity)
**Phase to address:** Phase 2 (template editor)

**What goes wrong:**
The template editor write endpoint accepts JSON from the frontend and writes it to `Classification/Templates/*.json`. If Zod validation is skipped (e.g., during error handling or a bypass path), malformed or malicious JSON can corrupt classification templates. Corrupted templates mean PowerShell misclassifies privileged identities — a silent, high-impact security regression.

**Why it happens:**
Developers add a "just save what I have" escape hatch during development and forget to remove it. Or they validate the shape but not the content (e.g., allowing injection of arbitrary `RoleDefinitionActions` values that are never in the real schema).

**Consequences:**
Schema corruption silently causes privileged identities to be misclassified (e.g., ControlPlane tier downgraded to UserAccess), which is the opposite of the tool's purpose.

**Prevention:**
- Validate with Zod's `.parse()` (throws on failure) — never `.safeParse()` followed by writing on parse failure
- The Zod schema must be the **single source of truth** — import it in both the frontend form validation and the backend write handler
- Write to a `.tmp` file first, validate the written file can be re-parsed, then rename atomically (avoids partial writes)
- Keep the schema versioned in a `schema/` directory so mismatches between disk content and code schema produce a readable error

**Warning signs:**
- `res.json({ ok: true })` before the Zod parse result is checked
- Separate schema definitions in frontend and backend that can diverge
- No test that writes a malformed body to the template endpoint and expects a 400

---

## Critical Pitfalls — Architecture

---

### PITFALL-A1: Blocking the Node.js Event Loop with Synchronous Large JSON Reads

**Category:** Performance (architectural correctness)
**Phase to address:** Phase 1 (data pipeline)

**What goes wrong:**
`PrivilegedEAM/` aggregate JSON files can reach hundreds of MB across all RBAC systems. Using `fs.readFileSync()` + `JSON.parse()` on the main Express thread blocks the event loop for seconds while parsing. All other requests queue behind it, making the app feel frozen.

```js
// BLOCKS the entire Express server for 2-5 seconds on large files
app.get('/api/eam/all', (req, res) => {
  const data = JSON.parse(fs.readFileSync('PrivilegedEAM/All.json', 'utf8'))
  res.json(data)
})
```

**Why it happens:**
`readFileSync` is simpler and synchronous, so developers reach for it first. The problem only manifests with real data at scale.

**Consequences:**
Dashboard becomes unresponsive whenever a large file is re-read. If the frontend polls frequently (TanStack Query refetchInterval), the server is perpetually blocked.

**Prevention:**
- Use `fs.promises.readFile()` (async) for all file reads
- For files >5MB, consider streaming with `stream-json` (parses incrementally without loading the full payload into memory)
- Cache parsed results in memory with a file watcher (`fs.watch`) to invalidate on change — avoid re-parsing on every API call
- Add a file size check before parsing; surface a warning in the UI if a single file exceeds a configurable threshold

**Warning signs:**
- Any `readFileSync` in an Express route handler
- `JSON.parse` called on the result of a full file read in a route handler
- TanStack Query `refetchInterval` set below 30 seconds without server-side caching

---

### PITFALL-A2: Orphaned PowerShell Processes on Client Disconnect

**Category:** Process Lifecycle / Resource Leak
**Phase to address:** Phase 3 (Command Runner)

**What goes wrong:**
The command runner streams PowerShell output via SSE (Server-Sent Events). If the user:
- Closes the browser tab
- Navigates away
- Clicks Stop but the `fetch`/EventSource is already torn down

...the SSE connection drops but the `child_process` spawned for PowerShell continues running. It can hold open Graph API connections, write partial JSON to `PrivilegedEAM/`, or consume 100% CPU indefinitely.

**Why it happens:**
SSE is fire-and-forget from the client side. Developers focus on the happy path (process completes normally) and miss the cleanup path.

**Consequences:**
Multiple orphaned `pwsh` processes accumulate per developer session. Partial writes corrupt EAM JSON files. Graph API rate limits are consumed.

**Prevention:**
- Attach a `req.on('close', cleanup)` handler to the SSE route — this fires when the client disconnects
- In `cleanup`, call `proc.kill('SIGTERM')` and after a 2-second timeout, `proc.kill('SIGKILL')`
- Track the active process in a module-level `Map<string, ChildProcess>` keyed by a run ID
- On Express server `SIGTERM`/`SIGINT` (e.g., `npm run dev` Ctrl+C), kill all tracked processes before exit
- In the frontend, use `useEffect` cleanup to close the `EventSource` when the component unmounts

**Warning signs:**
- No `req.on('close')` handler on SSE routes
- No `process.on('SIGTERM')` handler in the Express entry point
- `Map` or reference to active child process not maintained

---

## Moderate Pitfalls — Cross-platform

---

### PITFALL-C1: PowerShell Executable Name and PATH Discovery

**Category:** Cross-platform compatibility
**Phase to address:** Phase 3 (Command Runner)

**What goes wrong:**
Hardcoding `'pwsh'` as the executable works on macOS/Linux but fails on some Windows configurations where:
- `pwsh` is not on PATH (installed to `C:\Program Files\PowerShell\7\pwsh.exe`)
- Windows PowerShell 5 (`powershell.exe`) is on PATH but PowerShell 7 is not
- The user has PowerShell 7 installed via Microsoft Store at a non-standard path

**Why it happens:**
The developer tests on macOS where `pwsh` is consistently in PATH via Homebrew.

**Consequences:**
`spawn('pwsh', ...)` throws `ENOENT` on Windows. The command runner shows an unhelpful "process failed" error with no indication of the real cause.

**Prevention:**
- On server startup, resolve the PowerShell executable path with `which`/`where.exe` and cache the result
- Provide a fallback search order: `pwsh` → `pwsh.exe` → `powershell.exe` (with a warning if only the latter is found)
- Surface the resolved path in the Settings page so users can see what the server found
- Accept a `PWSH_PATH` environment variable override for non-standard installations

**Warning signs:**
- Hardcoded `'pwsh'` string in process spawn code without any OS detection

---

### PITFALL-C2: Windows File Path Separators and Unicode in JSON

**Category:** Cross-platform compatibility
**Phase to address:** Phase 1

**What goes wrong:**
Three related sub-problems:

1. **Backslash paths in URL params**: On Windows, `path.join()` returns backslashes (`PrivilegedEAM\EntraID\All.json`). If these are sent to the frontend as part of a JSON response and then used in a subsequent API call URL, the `\` is treated as an escape character, breaking the URL.

2. **UTF-16 LE BOM from Windows PowerShell**: Even with PowerShell 7, `Out-File` on Windows defaults to UTF-8 **with BOM** (`EF BB BF`). Node's `fs.readFile(..., 'utf8')` will include the BOM character (`\ufeff`) at the start of the string, causing `JSON.parse()` to throw `SyntaxError: Unexpected token`.

3. **CRLF line endings**: JSON files written on Windows may have CRLF line endings. This is valid JSON but can cause git diff noise and may confuse simple string parsers.

**Prevention:**
- Normalize all paths to forward slashes before sending to frontend: `filePath.replace(/\\/g, '/')`
- Strip BOM before JSON.parse: `content.replace(/^\uFEFF/, '')`
- Set `PowerShellVersion` enforcement to PS 7+ and document that EntraOps PS scripts should use `-Encoding UTF8NoBOM` in `Out-File` calls

**Warning signs:**
- `JSON.parse` errors that appear only on Windows in CI or testing
- File-path-based API routes that break only on Windows
- `\ufeff` appearing in parsed JSON object keys

---

### PITFALL-C3: `child_process` spawn with shell:true on Windows

**Category:** Security + Cross-platform
**Phase to address:** Phase 3

**What goes wrong:**
Setting `shell: true` in `spawn` options solves some Windows PATH issues but:
1. Re-introduces shell injection risk (arguments are processed by cmd.exe)
2. On Windows, the shell is `cmd.exe`, not `pwsh`, so PowerShell-specific argument quoting rules don't apply
3. Exit codes behave differently under the shell wrapper

**Prevention:**
Never use `shell: true`. Instead, resolve the full path to `pwsh.exe` at startup (see PITFALL-C1) and pass it as the explicit executable.

**Warning signs:**
- `{ shell: true }` in any `spawn` options object

---

## Moderate Pitfalls — Developer Experience

---

### PITFALL-D1: Vite Proxy and Express Port Collision / Dev vs. Production Divergence

**Category:** Developer Experience
**Phase to address:** Phase 1 (scaffold)

**What goes wrong:**
The standard setup runs Vite on port 5173 and Express on 3001, with Vite proxying `/api` to Express. Three failure modes:

1. **Port collision**: `concurrently` starts both servers simultaneously; if Express is slow to start, Vite proxy requests fail with ECONNREFUSED and the developer sees React Query errors that look like API bugs
2. **CORS double-headers**: If Express also sets CORS headers AND Vite's proxy sets them, browsers see duplicate `Access-Control-Allow-Origin` headers and reject the response
3. **dev/prod divergence**: The Vite proxy only exists in dev mode. After `npm run build`, the frontend is served as static files — but Express must also serve those static files. If this isn't set up, `npm run start` produces a blank page or 404 for all frontend routes

**Prevention:**
- Add a health check retry loop in Vite config's `proxy` option: `{ target: 'http://127.0.0.1:3001', changeOrigin: true }`
- Remove all `cors()` middleware from Express when behind the Vite proxy in dev mode; add it only for the production static-file server if needed
- In production Express config, add `app.use(express.static('dist'))` and a catch-all `app.get('*', ...)` to serve `index.html` for client-side routing
- Add an `npm run start` script that skips Vite and serves the built frontend from Express so this path is tested regularly

**Warning signs:**
- ECONNREFUSED errors in the browser network tab that appear only on fresh server start
- `Access-Control-Allow-Origin` appearing twice in response headers
- `npm run build && npm run start` produces different behavior than `npm run dev`

---

### PITFALL-D2: Shared Types Between Frontend and Backend Causing Bundle Leakage

**Category:** Developer Experience / Architecture
**Phase to address:** Phase 1 (scaffold)

**What goes wrong:**
Placing shared TypeScript types in files that also import `fs`, `path`, or `child_process` causes Vite to attempt to bundle those server-only Node modules into the frontend build. This either:
1. Fails the build with "cannot find module 'fs'"
2. Silently includes server code in the client bundle (leaking internal paths, file structure, dependency versions)

**Why it happens:**
It's tempting to put types and their usage together. `types/eam.ts` exports `EamObject` interface and also imports `z` from `zod` — Zod works fine in the browser, but if the same file later gets a `path`/`fs` import added, the leak begins.

**Prevention:**
- Create `src/shared/` (or `shared/` at root) for all types used by both frontend and backend
- Enforce that `shared/` files have **zero** Node.js built-in imports — add an ESLint rule or CI check
- Keep all `fs`, `path`, `child_process`, and `simple-git` imports in `server/` directory only
- Run `vite build` in CI and check that the bundle doesn't reference Node built-ins

**Warning signs:**
- Vite build warnings about "externalized" or "could not resolve" for Node built-ins
- `process.env` references appearing in the built client bundle

---

### PITFALL-D3: TanStack Table Filter State Causing Excessive Re-renders

**Category:** Performance / Developer Experience
**Phase to address:** Phase 1 (object browser)

**What goes wrong:**
Two compounding problems:

1. **URL-synced filter state causes double render**: Updating URL search params triggers a router-level re-render before TanStack Table processes the filter. With 5+ active filters on a 5,000-row dataset, the user sees visible lag (>200ms) on every keystroke in the search box.

2. **Column filter functions recreated on every render**: If `columnFiltersFns` or `filterFns` are defined inline (as arrow functions in component body), TanStack Table treats them as new functions on every render and re-filters the entire dataset unnecessarily.

**Why it happens:**
Developers wire filter state directly to `useState` and URL params simultaneously without debouncing. Column definitions are defined inside the component function.

**Consequences:**
The object browser feels sluggish for any tenant with more than ~500 privileged objects. This is highly likely given large enterprises using EntraOps.

**Prevention:**
- Define column definitions **outside** the component (module level or `useMemo`) — never inline
- Separate local filter state from URL state: update local state immediately (for responsive UI), debounce URL updates by 300ms
- For datasets >2,000 rows, consider `manualFiltering: true` with server-side filtering in Express (reads from cached, pre-parsed JSON)
- Use `React.memo` on table row components to prevent re-renders of unchanged rows

**Warning signs:**
- Column definitions defined inside the render function body
- `useSearchParams` setter called on every keystroke without debouncing
- React DevTools profiler showing full table re-renders on single filter changes

---

## Moderate Pitfalls — Schema and Data Integrity

---

### PITFALL-M1: Zod Schema Diverging from Existing Classification Templates on Disk

**Category:** Schema Migration / Data Integrity
**Phase to address:** Phase 2 (template editor)

**What goes wrong:**
The Zod schema for `Classification/Templates/*.json` is written against the current known structure. But:
1. EntraOps has been running in the user's fork — their templates may have been edited manually and contain extra fields not in the schema
2. A future EntraOps update adds a new field to the template format; the GUI's Zod schema rejects the new field and blocks the editor from opening

**Why it happens:**
`schema.parse()` is strict by default — it rejects unknown keys with `ZodError`.

**Consequences:**
The template editor throws an error on load for users with customized templates. Or worse: `.strip()` silently drops custom fields the user added, and saving overwrites them.

**Prevention:**
- Use `schema.passthrough()` on the outer template object to preserve unknown keys when loading
- Only validate (strict) the fields the GUI **writes** — not the entire file structure
- On load, use `.safeParse()` and display a warning badge ("This template has fields the GUI doesn't recognize — they will be preserved") rather than blocking the editor

**Warning signs:**
- `z.object({...}).parse(rawJson)` without `.passthrough()` on a file written by an external tool
- No test that loads a template with an extra unknown field and verifies it round-trips without data loss

---

### PITFALL-M2: git Operations Failing on Edge-Case Repository States

**Category:** Git operations / Resilience
**Phase to address:** Phase 1 (dashboard) and Phase 4 (change history)

**What goes wrong:**
`simple-git` throws unhandled exceptions for:
1. **Uninitialized repo**: User has a fresh copy of EntraOps not yet committed to git (common for local testing). `git.log()` throws `fatal: your current branch 'main' does not have any commits yet`.
2. **Detached HEAD**: GitHub Actions checks out a specific SHA, not a branch. `git.branch()` returns empty `current`. Any code that assumes a branch name is present will crash.
3. **Shallow clone**: `git clone --depth 1` (common in CI). `git log` returns only 1 commit; `git diff` between two commits fails if one is outside the shallow history.
4. **Uncommitted PrivilegedEAM/ files**: If the user runs `Save-EntraOpsPrivilegedEAMJson` without committing, `git log` shows no changes but files are newer than the last commit — the "data freshness" indicator is wrong.

**Prevention:**
- Wrap **every** `simple-git` call in try/catch and return a graceful empty response (`{ commits: [], error: 'No git history' }`)
- Use `git.checkIsRepo()` before any git operations; return empty state if false
- For data freshness, combine `fs.stat()` mtime with the git log — use the **later** of the two as the authoritative timestamp

**Warning signs:**
- `simple-git` calls without `try/catch`
- Code that accesses `result.current` from `git.branch()` without null-checking
- No test with an empty/uninitialized git repo

---

## Minor Pitfalls

---

### PITFALL-MIN1: PowerShell ANSI Output Rendering (Progress Bars)

**Category:** UX / Terminal rendering
**Phase to address:** Phase 3

**What goes wrong:**
`ansi-to-html` handles standard SGR sequences (colors, bold) but not:
- PowerShell progress bars (written using `Write-Progress`, which emits OSC sequences or raw ANSI that overwrite lines using `\r`)
- Hyperlinks (`OSC 8`)
- When progress records hit the HTML renderer, they produce a wall of garbled `\r`-prefixed lines

**Prevention:**
- Strip PowerShell progress record sequences before passing to `ansi-to-html` (regex: `/\x1b\[\d+[A-G]/g` covers cursor movement)
- Consider `xterm.js` instead of `ansi-to-html` — it handles OSC, cursor movement, and `\r` overwrites natively, rendering a true terminal experience
- At minimum, replace `\r` (without following `\n`) with `\n` to prevent line overwrite in HTML

**Warning signs:**
- PowerShell `Write-Progress` output appearing as garbled characters in the UI
- Vertical stacks of duplicate progress lines

---

### PITFALL-MIN2: `npm run dev` Hot Reload Restarting Express Mid-Request

**Category:** Developer Experience
**Phase to address:** Phase 1

**What goes wrong:**
`nodemon` (or `tsx --watch`) restarts Express when any server file changes. If the developer is mid-way through a PowerShell command run, the restart kills the child process without cleanup (duplicating PITFALL-A2 at dev time) and resets all in-flight SSE connections.

**Prevention:**
- Configure `nodemon` to ignore `PrivilegedEAM/` and `Classification/` change events — these are data directories that should not trigger server restarts
- Implement the same process cleanup logic in dev mode as production (see PITFALL-A2) — nodemon's `restart` event can trigger the cleanup hook if you use `nodemon` programmatically

**Warning signs:**
- `nodemon` or `tsx --watch` watching the entire project root without exclusions
- Server restart log messages appearing during active command runs

---

## Phase-Specific Warning Map

| Phase | Feature | Most Relevant Pitfalls |
|-------|---------|----------------------|
| 1 | Server scaffold | S3 (network exposure), D1 (proxy setup), C2 (path separators/BOM) |
| 1 | Data pipeline / file reads | A1 (blocking JSON parse), S2 (path traversal), M2 (git edge cases) |
| 1 | Object browser table | D3 (filter re-renders) |
| 1 | Type sharing | D2 (bundle leakage) |
| 2 | Template editor | S4 (schema validation on write), M1 (Zod/disk schema drift) |
| 3 | Command runner | S1 (shell injection), A2 (orphaned processes), C1 (pwsh path), C3 (shell:true), D2, MIN1 |
| 3 | Hot reload in dev | MIN2 (nodemon restart) |
| 4 | Change history | M2 (git edge cases: shallow clone, detached HEAD) |
| 5 | Settings page | S2 (path traversal on config write), S4 (schema validation) |

---

## Sources

- [OWASP Top 10 2021](https://owasp.org/Top10/) — A01, A03 (path traversal, injection)
- [Node.js child_process docs](https://nodejs.org/api/child_process.html) — spawn vs exec security model
- [TanStack Table v8 performance guide](https://tanstack.com/table/v8/docs/guide/column-filtering) — memoization requirements
- [Vite proxy configuration](https://vitejs.dev/config/server-options.html#server-proxy) — dev proxy setup
- [simple-git README](https://github.com/steveukx/git-js) — error handling patterns
- Codebase analysis: `/Users/nathanhutchinson/Dev/EntraOps/.planning/codebase/CONCERNS.md` — security and performance patterns in existing PS codebase
- Codebase PRD: `/Users/nathanhutchinson/Dev/EntraOps/GUI-PRD.md` — confirmed risk areas (NF-06, NF-07)
