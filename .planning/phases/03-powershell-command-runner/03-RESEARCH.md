# Phase 3: PowerShell Command Runner — Research

**Date:** 2026-03-25
**Phase:** 03-powershell-command-runner

---

## Summary

Phase 3 adds server-side process execution with real-time output streaming. The key technical questions are:
1. Which terminal UI component best fits the React + Tailwind v4 stack?
2. How should streaming output be transported (SSE GET vs POST streaming)?
3. How should cross-platform `pwsh` be spawned safely?
4. What's the right data model for run history?

The CONTEXT.md locks all product decisions (allowlist, history schema, status badges, etc.). Research focuses on implementation patterns only.

---

## Standard Stack

```
server:
  - Express v5 + child_process.spawn (Node 22, shell: false)
  - SSE via POST streaming response (fetch + ReadableStream on client)
  - node:crypto randomUUID() for run IDs (no uuid package needed — Node 22 built-in)
  - ansi-to-html@0.7.2 (stream: true) for ANSI server-side chunk conversion

client:
  - Custom TerminalOutput React component (<pre> rendering HTML chunks)
  - cmdk (already installed) for command palette
  - shadcn/ui Checkbox, Input, Badge, ScrollArea for form + status
  - Terminal icon from lucide-react for sidebar nav
  - fetch + ReadableStream for POST streaming (not EventSource — GET-only)
```

---

## Finding 1: Terminal UI Component — ansi-to-html over xterm.js

**Decision: Use `ansi-to-html@0.7.2` (already widely deployed) + custom `<pre>` component.**

`@xterm/xterm` 6.0.0 is the VS Code terminal emulator — powerful, canvas-rendered, handles interactive PTY. But this use case is **read-only one-way output**: no stdin, no cursor movement, no resizing. xterm.js requires imperative DOM manipulation (`useRef` + `useEffect`), weighs 5.92 MB unpacked, and needs `@xterm/addon-fit` for sizing. That overhead is not justified.

`ansi-to-html` (79 KB, 4 years stable, 2.4M weekly downloads) with `stream: true` converts incremental ANSI chunks to HTML spans. Renders into a `<pre>` element styled with a dark monospace theme. Auto-scroll is simple DOM logic (`scrollTop = scrollHeight`).

**XSS note:** The output source is our own `child_process.spawn()` — the content is not user-supplied text rendered as HTML, it's PowerShell stdout/stderr from an allowlisted cmdlet. `dangerouslySetInnerHTML` is acceptable here. Document this decision in the component.

**Implementation pattern:**
```ts
// Server: do NOT strip ANSI — per CONTEXT.md decision
process.stdout.on('data', (chunk) => {
  res.write(`data: ${JSON.stringify({ type: 'stdout', data: chunk.toString() })}\n\n`);
});

// Client: accumulate HTML
const converter = new Convert({ stream: true });
const [htmlLines, setHtmlLines] = useState<string>('');
// On each SSE chunk:
setHtmlLines(prev => prev + converter.toHtml(chunk));
```

**Install required:**
- `gui/client`: `ansi-to-html` + `@types/ansi-to-html` (check if types ship with package — they do, TS icon on npm)
- Note: `@types/ansi-to-html` may not be needed separately if types are bundled

---

## Finding 2: SSE Transport — POST Streaming, not EventSource

**Decision: POST /api/commands/run → streams text/event-stream.**

`EventSource` is GET-only. Passing complex parameters (array of RBACsystems, booleans) as GET query params is fragile and requires careful encoding. The CONTEXT.md mentions "SSE endpoint: GET" — but that refers to the `Content-Type: text/event-stream` response, not the HTTP method.

Modern approach (React 19 + Node 22): POST with `fetch`, read via `Response.body.getReader()`:
```ts
const response = await fetch('/api/commands/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cmdlet, parameters }),
  signal: abortControllerRef.current.signal,
});
const reader = response.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // parse SSE frames from decoded chunks
}
```

**Express v5 SSE pattern (POST):**
```ts
router.post('/run', async (req, res, next) => {
  try {
    // 1. Validate cmdlet against allowlist (Zod z.enum([...ALLOWLISTED_CMDLETS]))
    // 2. Check no active process (409 if busy)
    // 3. Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // send headers immediately — starts the stream
    // 4. spawn pwsh, pipe stdout/stderr to res.write()
    // 5. On close, res.end()
  } catch (err) { next(err); }
});
```

`res.flushHeaders()` is Express v5 compatible. For the stop endpoint: `POST /api/commands/stop` (separate endpoint, not SSE).

---

## Finding 3: Process Spawning — child_process.spawn, shell:false

```ts
import { spawn, type ChildProcess } from 'node:child_process';

let activeProcess: ChildProcess | null = null;

function buildPwshArgs(cmdlet: string, parameters: Record<string, unknown>): string[] {
  const paramStr = Object.entries(parameters)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => {
      if (typeof v === 'boolean') return `-${k}`;
      if (Array.isArray(v)) return `-${k} ${(v as string[]).join(',')}`;
      return `-${k} "${String(v)}"`;
    })
    .join(' ');
  return ['-NoProfile', '-NonInteractive', '-Command', `${cmdlet}${paramStr ? ' ' + paramStr : ''}`];
}

activeProcess = spawn('pwsh', buildPwshArgs(cmdlet, parameters), {
  shell: false,                          // NEVER shell: true — prevents injection
  env: { ...process.env },               // inherit parent env (needed for module path)
  cwd: REPO_ROOT,                        // run from repo root so module paths resolve
});
```

**CRITICAL security constraint (from CONCERNS.md + CONTEXT.md):** The cmdlet name from `req.body.cmdlet` MUST be validated via `z.enum([...ALLOWLISTED_CMDLETS])` BEFORE being passed to spawn. Never pass `req.body.cmdlet` directly.

**Cross-platform kill:** `activeProcess.kill()` sends SIGTERM on POSIX and terminates on Windows. Works on both.

**Pwsh startup check:**
```ts
import { spawnSync } from 'node:child_process';
const check = spawnSync('pwsh', ['--version'], { encoding: 'utf-8', timeout: 5000 });
if (check.error || check.status !== 0) {
  console.warn('pwsh not found — command runner disabled');
  // Surface this as a GET /api/commands/health endpoint returning { available: false }
}
```

Run `cwd: REPO_ROOT` so that the EntraOps module (`.psd1` in repo root) is on the PS module path. Callers must have already run `Connect-EntraOps` in their PS session prior to using the GUI — the GUI does not manage authentication.

---

## Finding 4: Run History — Node 22 crypto.randomUUID

```ts
import { randomUUID } from 'node:crypto';  // Node 22 built-in — no uuid package needed
```

**Atomic write pattern** (same as template routes):
```ts
async function saveHistory(records: RunHistoryRecord[]): Promise<void> {
  const capped = records.slice(-500);  // FIFO cap at 500
  const tmp = HISTORY_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(capped, null, 2), 'utf-8');
  await fs.rename(tmp, HISTORY_PATH);
}
```

Read on startup (optional — history endpoint can be lazy-loaded). History file lives at `gui/.entraops-run-history.json` — must add to `.gitignore`.

---

## Finding 5: GET /api/config Endpoint

Phase 5 (Settings) hasn't been planned, so Phase 3 needs its own config reader. Pattern mirrors global exclusions endpoint:

```ts
// GET /api/config — returns parsed EntraOpsConfig.json or {} if missing
router.get('/config', async (_req, res, next) => {
  try {
    const configPath = path.join(REPO_ROOT, 'EntraOpsConfig.json');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      res.json(JSON.parse(raw.replace(/^\uFEFF/, '')));
    } catch {
      res.json({}); // File missing or unreadable — empty config, not 404
    }
  } catch (err) { next(err); }
});
```

Config endpoint lives in a new `config` router (`gui/server/routes/config.ts`) mounted at `/api/config`. Phase 5 will replace this with a full read/write settings router.

---

## Finding 6: Client Route and Component Structure

**New route:** `/run` (Run Commands page)

**Sidebar nav entry:** `Terminal` icon from lucide-react, label "Run Commands", added to `NAV_ITEMS` in `Sidebar.tsx`.

**`cmdk`** (already installed in client) — use `<Command>` component for the command palette list. User types to filter cmdlets, arrows/click to select.

**shadcn components needed** (check if installed):
- `Badge` — for status display (Running/Complete/Failed/Stopped)
- `ScrollArea` — for history list
- `Checkbox` — for RBACsystems multi-select
- `Input` — for string parameter fields
- `Dialog` — for no-parameter confirmation on `Update-EntraOps`
- `Separator` — for run dividers in terminal

Run `npx shadcn@latest add badge scroll-area checkbox input dialog separator` in `gui/client`.

---

## Finding 7: Concurrency Gate — 409 Conflict

The `/api/commands/run` endpoint must:
1. Check `activeProcess !== null` — if true, return `409 { error: 'A command is already running. Stop it before starting a new one.' }`
2. Validate cmdlet via `z.enum([...ALLOWLISTED_CMDLETS])` — if invalid, return `400`
3. Check pwsh available — if not, return `503`

Client handles 409 by showing a toast (sonner, already installed) with a "Stop current command?" action button.

---

## Validation Architecture

```
## Validation Architecture

### Security Boundary Tests (RUN-04)
- Test: POST /api/commands/run with non-allowlisted cmdlet → must return 400
- Test: POST /api/commands/run with allowlisted cmdlet → must NOT pass raw body string to spawn
- Verify: ALLOWLISTED_CMDLETS is the only source of valid cmdlet names (single constant, one place)

### Streaming Tests (RUN-03)
- Test: SSE response has Content-Type: text/event-stream
- Test: stdout chunks appear as SSE data events before process exits
- Test: stderr chunks also surfaced as SSE events (type: 'stderr')
- Test: final SSE event has type: 'exit' with exit code

### Concurrency Tests (RUN-05)
- Test: second POST while activeProcess is running → 409
- Test: POST /api/commands/stop while running → process.kill() called, stream ends
- Test: stop message injected into stream on kill: `[Stopped by user at HH:MM:SS]`

### History Tests (RUN-06)
- Test: completed run writes record to history file with all required fields
- Test: history capped at 500 entries (501st entry drops oldest)
- Test: GET /api/commands/history returns persisted records after server restart

### Cross-Platform
- pwsh available at /opt/homebrew/bin/pwsh (macOS) ✓ (confirmed: PowerShell 7.5.0)
- GET /api/commands/health returns { available: true } when pwsh found
```

---

## Packages to Install

**Server (`gui/server`):**
```
ansi-to-html  # (check if needed server-side for RESEARCH only — client handles ANSI rendering)
```
No server-side package additions needed — all built on Node 22 + Express v5 + existing deps.

**Client (`gui/client`):**
```
ansi-to-html        # runtime ANSI → HTML conversion in browser
```

**shadcn components (client):**
```
badge scroll-area checkbox input dialog separator
```

---

## Don't Hand-Roll

- UUID generation → `crypto.randomUUID()` (Node 22 built-in)
- ANSI rendering → `ansi-to-html@0.7.2` with `stream: true`
- Command palette filtering → `cmdk` (already installed)
- Streaming fetch → native `fetch` + `Response.body.getReader()`
- Atomic file writes → existing `atomicWrite` pattern from templates service

---

## Common Pitfalls

1. **`shell: true` in spawn** — enables shell injection; always `shell: false`
2. **Passing `req.body.cmdlet` directly to spawn** — must go through `z.enum` allowlist first
3. **Not calling `res.flushHeaders()`** — without this, headers buffer until first write; client sees no stream
4. **`EventSource` for POST SSE** — EventSource is GET-only; use `fetch` + ReadableStream
5. **ANSI stripping on server** — do NOT strip; client renders via ansi-to-html
6. **`process.kill()` leaves zombie** — call `activeProcess = null` in the `close` event handler, not in the stop endpoint itself
7. **History file not in `.gitignore`** — add `gui/.entraops-run-history.json` to `.gitignore` before first test run
8. **Running pwsh without `cwd: REPO_ROOT`** — cmdlets won't find their module dependencies
9. **`Update-EntraOps` confirmation** — this cmdlet modifies module files on disk; the no-parameter dialog must warn about this explicitly
10. **Missing `AbortController` signal** — when Stop is clicked, the fetch must be aborted via AbortController, AND `POST /api/commands/stop` must be called to kill the process

---

## Architecture Summary

```
Client                         Server                          System
──────                         ──────                          ──────
RunCommandsPage                commandsRouter                  pwsh process
  ├─ CommandPalette             ├─ POST /run                   (child_process.spawn)
  │   └─ cmdk Command          │   ├─ validate allowlist
  ├─ ParameterForm             │   ├─ check concurrency
  │   ├─ RbacSystemSelect      │   ├─ spawn pwsh
  │   ├─ BooleanToggles        │   └─ stream SSE
  │   └─ StringInputs          ├─ POST /stop
  ├─ TerminalOutput            │   └─ kill + inject message
  │   └─ <pre> + ansi-to-html  ├─ GET /history
  └─ CommandHistory            │   └─ read history file
      └─ ScrollArea list       ├─ GET /health
                               │   └─ pwsh availability
                               └─ configRouter
                                   └─ GET /api/config
                                       └─ EntraOpsConfig.json
```
