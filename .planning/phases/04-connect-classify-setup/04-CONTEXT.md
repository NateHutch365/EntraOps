# Phase 4: Connect & Classify Setup — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can connect to their Entra tenant and run their first classification entirely from the browser — entering their tenant name, authenticating via device code flow, selecting RBAC systems, and streaming live classification output — without touching a terminal. This phase introduces a dedicated Connect page with a multi-step wizard flow. Object-level reclassification (overriding individual tier assignments) is explicitly out of scope — deferred to Phase 5.5.

</domain>

<decisions>
## Implementation Decisions

### A. Wizard Flow & Page Structure

**Multi-step wizard with 4 steps:**
1. **Tenant** — Enter tenant name (`TenantName`), auth type selector (device code default; `UserInteractive` also shown)
2. **Authenticate** — Live streaming terminal showing `Connect-EntraOps -AuthenticationType DeviceAuthentication` output; device code URL + code displayed prominently; step advances automatically on successful auth
3. **Review & Classify** — Checklist of the 5 RBAC systems (EntraID, ResourceApps, IdentityGovernance, DeviceManagement, Defender); all pre-checked by default; user can uncheck before confirming; "Start Classification" button fires the run
4. **Classifying** — Live streaming terminal (reusing Phase 3 `TerminalOutput` component) showing `Save-EntraOpsPrivilegedEAMJson` output; completion state shows success/failure and a "Go to Dashboard" CTA

**Wizard navigation rules:**
- Forward navigation only (no back button mid-stream — backtracking while a command is running is unsupported)
- Step indicators shown across the top (1–4 with labels)
- Cancel at any step disconnects (calls `Disconnect-EntraOps` if past step 2) and resets to step 1

### B. Connection State Indicator

**Persistent "Connected" indicator in the bottom-left of the sidebar** — same area as the app version or footer, always visible regardless of current page.

**Two states:**
- `● Connected` — green dot + tenant name (e.g. `cloudlab.onmicrosoft.com`) — shown when a successful `Connect-EntraOps` run has completed in this server session
- `○ Not connected` — grey dot + "Not connected" label — shown on startup and after disconnect

**State is session-only** — connection state is tracked in server memory (no persistence across server restarts). On server restart the indicator resets to "Not connected" — the user must reconnect. The Connect page is always accessible regardless of connection state.

**Server-side endpoint:** `GET /api/connect/status` returns `{ connected: boolean, tenantName: string | null }`. Client polls this on mount and after wizard completion.

### C. Pre-Classification Review Checkpoint (RBAC System Selection)

**Dedicated Step 3 in the wizard** — after authentication succeeds, before classification fires. User sees all 5 RBAC systems as labelled checkboxes with short descriptions:
- `EntraID` — Entra ID roles and Administrative Units
- `ResourceApps` — Azure resource app role assignments
- `IdentityGovernance` — Identity Governance roles and entitlements
- `DeviceManagement` — Intune / Device Management roles
- `Defender` — Microsoft Defender for Identity roles

**All checked by default.** User can uncheck any to exclude from this run. At least one must remain checked (Run button disabled if all unchecked, with inline validation message).

**Selections are pre-populated from `EntraOpsConfig.json`** `RbacSystems` field if present — same pattern as Phase 3 param form.

**No auto-fire** — classification only starts when the user explicitly clicks "Start Classification". The step makes the intent explicit.

### D. Dashboard Refresh After Classification

**Toast notification with a "Go to Dashboard" button** — when classification completes successfully (step 4 terminal shows no errors), a toast appears: *"Classification complete — your dashboard data has been updated."* with a button that navigates to `/`.

**No silent auto-refresh of the dashboard** — the dashboard data only reloads when the user navigates to it. The toast is the trigger for the user to choose when to navigate. This avoids surprising data changes mid-session on another page.

**Error case:** If classification exits with a non-zero code, the toast shows red: *"Classification completed with errors — check the output above."* No navigation CTA on error.

</decisions>

<code_context>
## Reusable Assets from Prior Phases

### Phase 3 Components (direct reuse)
- `gui/client/src/components/commands/TerminalOutput.tsx` — ANSI-rendering terminal with auto-scroll, stop button, status badge. Reuse for both the Connect step (step 2) and the Classify step (step 4) terminal views.
- `gui/client/src/components/commands/` — general pattern for SSE stream consumption (`fetch + ReadableStream` reader with SSE frame parsing) — reuse exactly in new connect/classify service.
- `gui/server/services/commands.ts` — process spawn/stop/history pattern. New service for connect+classify will follow the same `spawn('pwsh', args, { shell: false })` pattern.
- `gui/server/routes/config.ts` — `GET /api/config` already returns parsed `EntraOpsConfig.json`; use to pre-populate `TenantName` and `RbacSystems` in step 1 and step 3.

### Phase 2 Components
- `gui/client/src/pages/TemplatesPage.tsx` — tabbed layout pattern; not reused directly but wizard step indicator can follow similar tab-style progression.

### Shared Types
- `gui/shared/types/commands.ts` — `ALLOWLISTED_CMDLETS`, `RunHistoryRecord`, `CommandRunEvent` — the connect/classify flow will add new types alongside these (e.g. `ConnectRequest`, `ConnectStatus`).

### Layout
- `gui/client/src/components/layout/Sidebar.tsx` — add `Connected` status indicator to the existing sidebar footer area. Currently has no footer content — add a `<footer>` section at the bottom of the sidebar with the connection status pill.

### Existing Cmdlets (confirmed from source)
- `Connect-EntraOps -AuthenticationType DeviceAuthentication -TenantName <tenant>` — streams device code URL + code; completes on successful auth
- `Save-EntraOpsPrivilegedEAMJson -RbacSystems @('EntraID', ...) -TenantName <tenant>` — runs classification; already allowlisted in Phase 3
- `Disconnect-EntraOps` — called on wizard cancel after step 2 is passed; add to allowlist

### New Routes Needed
- `POST /api/connect/start` — spawn `Connect-EntraOps` via SSE stream
- `POST /api/connect/disconnect` — execute `Disconnect-EntraOps`
- `GET /api/connect/status` — return `{ connected: boolean, tenantName: string | null }`
- Note: `/api/commands/run` + `/api/commands/stop` (Phase 3) handle the classify step — reuse directly

### New Page
- `gui/client/src/pages/ConnectPage.tsx` — 4-step wizard; mounts at route `/connect`; add to Sidebar nav with a `Link` icon

</code_context>

<deferred_ideas>
## Deferred Ideas (captured, not acted on)

- **Object-level reclassification** — Post-classification review screen where users override individual objects' tier assignments inline. Added to roadmap as **Phase 5.5** (between Phase 5 and 6). Requires its own discuss + plan cycle.
</deferred_ideas>
