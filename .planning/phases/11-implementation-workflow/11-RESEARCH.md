# Phase 11: Implementation Workflow — Research

**Researched:** 2026-04-04
**Discovery Level:** 0 (pure internal reuse — all patterns established)
**New dependencies:** None

## Standard Stack

No new libraries required. All components are installed.

| Need | Solution | Already in project |
|------|----------|--------------------|
| SSE streaming | `fetch + ReadableStream` pattern | RunCommandsPage.tsx |
| Terminal display | `TerminalOutput` + `AnsiConvert` | @/components/commands/TerminalOutput |
| Checkbox selection | shadcn `Checkbox` | Already installed |
| Table (confirmation) | shadcn `Table` | Already installed |
| Warning banner | shadcn `Alert` | Already installed |
| Status badges | shadcn `Badge` | Already installed |
| Icons | Lucide React (`PlayCircle`, `CheckCircle2`, `AlertCircle`, `XCircle`, `OctagonX`) | Already installed |
| Toast notifications | sonner | Already mounted in App.tsx |
| Navigation | React Router `useNavigate`, `NavLink` | Already in use |

## Architecture Patterns

### Pattern 1: Sequential Multi-Cmdlet SSE Execution

RunCommandsPage runs one cmdlet at a time via `POST /api/commands/run`. The server enforces single-process via `isRunning()` guard (409 if busy). Phase 11 chains multiple cmdlets sequentially:

```
for each selectedCmdlet:
  1. POST /api/commands/run { cmdlet, parameters }
  2. Read SSE stream until 'exit' event
  3. Record exit code → pass (0) / fail (non-0)
  4. Start next cmdlet
```

**Key constraint:** `runCommand()` in `gui/server/services/commands.ts` sets `activeProcess` module-scope and cleans it on `close`. The client must wait for the stream to end (`reader.read()` returns `done: true`) before starting the next POST. The `isRunning()` guard will reject concurrent calls with 409.

### Pattern 2: SSE Stream Consumption (Client)

Exact pattern from RunCommandsPage lines 92–145:

```typescript
const response = await fetch('/api/commands/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cmdlet, parameters }),
  signal: abort.signal,
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const frames = buffer.split('\n\n');
  buffer = frames.pop() ?? '';

  for (const frame of frames) {
    const line = frame.replace(/^data: /, '').trim();
    if (!line) continue;
    const event = JSON.parse(line) as { type: string; data: string };
    // handle stdout, stderr, exit, error
  }
}
```

No changes needed to this pattern — Phase 11 reuses it as-is, wrapped in a sequential loop.

### Pattern 3: TerminalOutput Component Reuse

`TerminalOutput` accepts:
- `htmlContent: string` — accumulated ANSI-converted HTML
- `status: CommandStatus` — drives badge display and Stop button visibility
- `onStop: () => void` — triggers abort

The component handles auto-scrolling, status badges, and stop button internally. Phase 11 passes `htmlContent` accumulated across all cmdlets (with separators between them).

`AnsiConvert` (re-exported `Convert` class) must be instantiated once per page with `{ stream: true, newline: true }` for stateful ANSI code tracking across chunks.

### Pattern 4: Page State Machine

RunCommandsPage uses `CommandStatus` state: `'idle' | 'running' | 'completed' | 'failed' | 'stopped'`. Phase 11 extends this to a 4-state page machine:

| State | Content shown | Exit conditions |
|-------|---------------|-----------------|
| `idle` | Action selection cards | "Review & Apply" → `confirming` |
| `confirming` | Cmdlet review table + warning | "Run Now" → `running`, "Back" → `idle` |
| `running` | TerminalOutput with SSE | All exit → `done`, Stop → `done` |
| `done` | Outcome summary + collapsed terminal | "Apply Again" → `idle` |

This maps cleanly to a single `useState<'idle' | 'confirming' | 'running' | 'done'>('idle')`.

### Pattern 5: Config Params for Cmdlet Parameters

RunCommandsPage fetches `/api/config` on mount to pre-fill TenantName and SubscriptionId. Phase 11 does the same — these values become cmdlet parameters in the POST body.

```typescript
useEffect(() => {
  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      if (typeof cfg.TenantName === 'string') setTenantName(cfg.TenantName);
      if (typeof cfg.SubscriptionId === 'string') setSubscriptionId(cfg.SubscriptionId);
    })
    .catch(() => {});
}, []);
```

### Pattern 6: Page Layout

ExclusionsPage and ReclassifyPage use `flex flex-col h-full` with a `px-6 py-4 border-b border-border` header. The UI-SPEC prescribes `p-6 max-w-2xl mx-auto` for ApplyPage — a narrower focused task layout. This is consistent with the page being a focused workflow rather than a data browser.

### Pattern 7: Sidebar Nav Insertion

`NAV_ITEMS` in `Sidebar.tsx` is a const array. A new entry goes at index 4 (after Exclusions):

```typescript
{ to: '/apply', icon: PlayCircle, label: 'Apply to Entra', end: false },
```

### Pattern 8: Cross-Page CTA Buttons

ObjectBrowser.tsx and ReclassifyPage.tsx each need a header-level "Apply to Entra" button. Both pages have a `<div>` with H1 + subtitle. The Button sits alongside the heading per UI-SPEC: `variant="secondary"`, `PlayCircle` icon.

## Don't Hand-Roll

| Feature | Use instead |
|---------|-------------|
| ANSI rendering | `AnsiConvert` from TerminalOutput.tsx |
| Terminal display | `TerminalOutput` component |
| SSE parsing | Existing `ReadableStream` pattern from RunCommandsPage |
| Status badges | `STATUS_BADGE` map pattern from TerminalOutput (same color tokens) |
| Alert banner | shadcn `Alert` + `AlertCircle` icon |

## Common Pitfalls

1. **Race condition on sequential cmdlets:** Must wait for `reader.read()` to return `done: true` before calling the next POST. The `isRunning()` server guard will 409 if the previous cmdlet's child process hasn't exited.

2. **AbortController scope:** When stopping mid-sequence, the abort controller kills the current fetch. Remaining cmdlets must be skipped — check a `stopped` flag before starting the next iteration.

3. **TerminalOutput height:** UI-SPEC specifies `h-[400px]` during running and `h-48` in outcome view. Pass this as a className override or wrapper div.

4. **Cmdlet-to-label mapping:** The mapping between AllowlistedCmdlet names and human-friendly labels (e.g., `Update-EntraOpsPrivilegedAdministrativeUnit` → "Administrative Units") should be defined once as a const for reuse across action cards, confirmation table, progress label, and outcome summary.

5. **Exit code null check:** `proc.on('close', (code) => ...)` — code can be `null` if process is killed. Treat `null` as failure (exit -1), same as existing `commands.ts` line: `String(code ?? -1)`.

## Security Considerations

- **Allowlist-only:** All 4 implementation cmdlets are already on `ALLOWLISTED_CMDLETS`. No allowlist changes needed.
- **No new backend routes:** Phase 11 reuses `POST /api/commands/run` — Zod validation with `z.enum(ALLOWLISTED_CMDLETS)` enforces the allowlist server-side.
- **shell: false:** Enforced in `commands.ts` `spawn()` — prevents injection.
- **PS single-quote escape:** `psq()` in commands service handles value injection safety.
- **No user-supplied cmdlet names in Phase 11:** The 4 cmdlets are hardcoded in the client const, not from user input.

## File Impact Summary

| File | Change |
|------|--------|
| `gui/client/src/pages/ApplyPage.tsx` | **NEW** — main implementation workflow page |
| `gui/client/src/App.tsx` | Add route `<Route path="apply" element={<ApplyPage />} />` |
| `gui/client/src/components/layout/Sidebar.tsx` | Add nav entry at index 4 |
| `gui/client/src/pages/ObjectBrowser.tsx` | Add "Apply to Entra" CTA button in header |
| `gui/client/src/pages/ReclassifyPage.tsx` | Add "Apply to Entra" CTA button in header |

No backend changes required. No new shared types needed — existing `AllowlistedCmdlet`, `CmdletParameters`, `CommandStatus`, `CommandRunEvent` types cover all needs.

---

*Research completed: 2026-04-04*
*Discovery level: 0 — all patterns established in codebase*
