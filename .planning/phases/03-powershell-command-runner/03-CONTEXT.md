# Phase 3: PowerShell Command Runner — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can trigger EntraOps management cmdlets from the browser with real-time streamed output, eliminating the need to switch to a terminal. The UI is the primary management surface — PowerShell is abstracted away entirely. Arbitrary code execution is not possible; only explicitly allowlisted cmdlets are available. Reading from or modifying PrivilegedEAM JSON files (the object browser) is out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### A. Allowlisted Cmdlets

**Allowlist is hardcoded in server source** — defined as a TypeScript constant in the new `commands` route file. Not user-configurable; changing it requires a code change. Configurable allowlists would widen the attack surface.

**Included cmdlets (full management coverage):**
- `Save-EntraOpsPrivilegedEAMJson`
- `Save-EntraOpsWorkloadIdentityInfo`
- `Save-EntraOpsPrivilegedEAMWatchLists`
- `Save-EntraOpsPrivilegedEAMInsightsCustomTable`
- `Save-EntraOpsPrivilegedEAMEnrichmentToWatchLists`
- `Save-EntraOpsWorkloadIdentityEnrichmentWatchLists`
- `Update-EntraOpsPrivilegedAdministrativeUnit`
- `Update-EntraOpsPrivilegedConditionalAccessGroup`
- `Update-EntraOpsPrivilegedUnprotectedAdministrativeUnit`
- `Update-EntraOpsClassificationControlPlaneScope`
- `Update-EntraOpsClassificationFiles`
- `Update-EntraOpsRequiredWorkflowParameters`
- `Update-EntraOps`

**Excluded cmdlets (not exposed in UI):**
- `Invoke-EntraOpsAzGraphQuery`, `Invoke-EntraOpsMsGraphQuery`, `Invoke-EntraOpsGraphSecurityQuery` — raw API passthrough accepting arbitrary query strings; not management operations; unbounded execution surface.

### B. Parameter Forms

**RBAC system multi-select** — the five known values hardcoded as checkboxes: `EntraID`, `ResourceApps`, `IdentityGovernance`, `DeviceManagement`, `Defender`. Dynamic discovery not needed; values are a fixed set in EntraOps.

**No-parameter cmdlets** (e.g. `Update-EntraOps`) — show a confirmation dialog with the cmdlet name before executing. No form fields shown. Prevents accidental triggers.

**String parameters pre-populated from `EntraOpsConfig.json`** — loaded at form open and mapped to known parameter names (e.g. `-TenantName`, `-SubscriptionId`). User can override inline before running. If `EntraOpsConfig.json` does not exist, fields are blank with a placeholder tooltip directing to Settings (Phase 5).

**Required parameters block the Run button** — form-level validation before submit. PowerShell error messages are not user-friendly; the UI catches missing required params with inline field errors. Optional params are clearly marked as optional.

### C. Terminal Output Behavior

**Auto-scroll** — terminal tracks the bottom as output streams in. User can scroll up to pause auto-scroll; scrolling back to the bottom resumes it.

**Output persists between runs** — previous run output stays visible in the terminal. A clear visual separator is injected between runs: a full-width divider line containing the new cmdlet name and start timestamp (e.g. `─── Save-EntraOpsPrivilegedEAMJson · 2026-03-25 14:32:01 ───`).

**Visual run states** — status badge with four distinct states:
- `● Running` — amber
- `✓ Complete` — green
- `✕ Failed` — red
- `◼ Stopped` — grey

Claude handles exact badge styling and positioning within the terminal header area.

**"Stopped by user" inline message** — when the Stop button is clicked and the process is killed, a distinct line is injected into the terminal output: `[Stopped by user at HH:MM:SS]`. The output record is complete and unambiguous.

### D. Command History

**Persistent across server restarts** — written to `gui/.entraops-run-history.json` in the repo root. Structured JSON; designed as the seed for a future audit log (data model should not need to change when auditing is introduced).

**Full entry per run** — each history record contains:
```
{
  "id": "<uuid>",
  "cmdlet": "Save-EntraOpsPrivilegedEAMJson",
  "parameters": { "RbacSystems": ["EntraID", "Defender"], "SampleMode": false },
  "startedAt": "2026-03-25T14:32:01.000Z",
  "endedAt": "2026-03-25T14:34:17.000Z",
  "durationSeconds": 136,
  "outcome": "completed"   // "completed" | "failed" | "stopped"
}
```

**Click to re-populate form** — clicking any history entry loads its cmdlet and parameters back into the command form. User can tweak and re-run. This is the primary interaction value.

**Cap: last 500 entries, FIFO** — when the 501st entry is written, the oldest is dropped. Sufficient for audit-oriented retention without unbounded growth. Retention policy revisited in a future audit phase.

</decisions>

<specifics>
## Specific Notes

- `Connect-EntraOps` sets global PS session state — the server must check `pwsh` availability at startup and surface a clear error if not found (`which pwsh` on macOS/Linux, `Get-Command pwsh` on Windows).
- The command runner is the most security-sensitive feature in the app. The allowlist constant must be the **only** place a cmdlet name is trusted. Any execution path that accepts a cmdlet name from the client request body must validate it against the allowlist before spawning any process — never pass client-supplied strings directly to `child_process`.
- Run history file (`gui/.entraops-run-history.json`) should be added to `.gitignore` — it contains tenant-specific operational data and timestamps that should not be committed.
- `Update-EntraOps` (self-update cmdlet) is included in the allowlist. The confirmation dialog for this cmdlet should note that it will update the module files on disk.
- ANSI colour stripping must NOT happen server-side — the terminal UI component handles ANSI rendering so colour is preserved in the browser display.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` §PowerShell Command Runner — RUN-01 through RUN-06
- `.planning/ROADMAP.md` §Phase 3 — success criteria (3 conditions that must be TRUE)

### Architecture & Stack Decisions
- `.planning/STATE.md` §Decisions — locked stack (Express v5, Zod v4, shadcn/ui, Tailwind v4, TypeScript)
- `gui/server/index.ts` — existing server entry point; new `commandsRouter` mounts here
- `gui/server/middleware/security.ts` — `securityMiddleware` and `errorHandler` patterns to follow
- `.planning/codebase/CONCERNS.md` §Security Considerations — review before implementing process spawning

### Prior Phase Context
- `.planning/phases/01-foundation-dashboard-object-browser/01-CONTEXT.md` — design system and shell decisions
- `gui/server/routes/templates.ts` — closest existing route pattern (POST with Zod validation + file write)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gui/server/middleware/security.ts` — `securityMiddleware` (host allowlist), `assertSafePath`, `errorHandler` — reuse pattern for cmdlet allowlist validation
- `gui/server/index.ts` — `app.use('/api/commands', commandsRouter)` mount point follows existing pattern
- `gui/shared/types/` — add `CommandEntry`, `RunHistoryRecord`, `CommandStatus` shared types here

### Established Patterns
- Zod v4 for request body validation — cmdlet name from client body validated against allowlist via `z.enum([...ALLOWLISTED_CMDLETS])` before any process is spawned
- Express v5 async route handlers — `async (req, res, next) => { try { ... } catch (e) { next(e) } }`
- Atomic file writes (temp → rename) — use same pattern for history file to prevent corruption on crash

### Integration Points
- SSE endpoint: `GET /api/commands/run` with `Content-Type: text/event-stream` — Express v5 compatible; `res.flushHeaders()` starts the stream immediately
- Process management: Node.js `child_process.spawn('pwsh', [...])` — one active process reference held in module scope; Stop button calls `process.kill()`
- History file: `gui/.entraops-run-history.json` — read/write from `commands` service; add to `.gitignore`
- `EntraOpsConfig.json` pre-population: read from repo root at form load via a new `GET /api/config` endpoint (or reuse Phase 5's settings route if planned before execution)

</code_context>

<deferred>
## Deferred Ideas

- **Audit log as a first-class feature** — persistent run history is the seed; a proper audit UI (filtering by cmdlet, outcome, date range; export to CSV) is a natural future phase.
- **Parameter schema discovery from pwsh** — dynamically calling `Get-Command <cmdlet> | Select -ExpandProperty Parameters` at runtime to drive forms. Deferred: adds startup latency and a pwsh dependency at form load time; hardcoded forms are sufficient for Phase 3.
- **Alerting on new ControlPlane identities post-run** — surfacing diff output after `Save-EntraOpsPrivilegedEAMJson` completes. Noted in PROJECT.md future candidates; out of Phase 3 scope.

</deferred>

---

*Phase: 03-powershell-command-runner*
*Context gathered: 2026-03-25*
