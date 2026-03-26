---
phase: 04-connect-classify-setup
verified: 2026-03-26T00:00:00Z
status: passed
score: 4/4 success criteria verified
re_verification: false
---

# Phase 4: Connect & Classify Setup — Verification Report

**Phase Goal:** Users can connect to their Entra tenant and run their first classification entirely from the browser — entering their tenant name, authenticating via device code flow, selecting RBAC systems, and streaming live classification output — without touching a terminal
**Verified:** 2026-03-26
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Connect page accessible from sidebar with tenant form, auth type selector, and RBAC checklist | ✓ VERIFIED | `Sidebar.tsx` L12: PlugZap/Connect nav item. `ConnectPage.tsx`: step 0 tenant form + auth RadioGroup; step 2 RBAC checkboxes. Route `/connect` wired in `App.tsx` L21 |
| 2 | Clicking Connect streams `Connect-EntraOps` output (device code URL + code) in real time | ✓ VERIFIED | `ConnectPage.tsx` L186: `fetch('/api/connect/start', ...)` opens SSE stream. L139–L150: `useEffect` extracts device code from raw output. Route streams `runConnect()` stdout/stderr line-by-line |
| 3 | After successful auth, classification runs via `Save-EntraOpsPrivilegedEAMJson` with selected RBAC systems, streaming to same terminal view | ✓ VERIFIED | `ConnectPage.tsx` L239: `fetch('/api/commands/run', ...)` with `cmdlet: 'Save-EntraOpsPrivilegedEAMJson'` and `parameters: { RbacSystems: selectedRbac }`. Reuses Phase 3 TerminalOutput |
| 4 | On completion, dashboard data is updated; toast surfaces "Go to Dashboard" CTA | ✓ VERIFIED | `ConnectPage.tsx` L164–L169: `toast.success('Classification complete', { action: { label: 'Go to Dashboard', onClick: () => navigate('/') } })`. Dashboard loads fresh file data on navigation. Intentional: no silent auto-refresh per CONTEXT.md decision D |

**Score:** 4/4 success criteria verified

---

### Required Artifacts

| Artifact | Provides | Lines | Status | Details |
|----------|----------|-------|--------|---------|
| `gui/shared/types/connect.ts` | `AUTH_TYPES`, `AuthType`, `ConnectRequest`, `ConnectStatus` | 15 | ✓ VERIFIED | All 4 exports present; `as const` pattern matches `commands.ts` convention |
| `gui/server/services/connect.ts` | Session-scoped Connect/Disconnect-EntraOps process lifecycle | 173 | ✓ VERIFIED | Exports `runConnect`, `disconnectEntraOps`, `getConnectionStatus`, `isConnecting`, `getAuthTokens`, `refreshAuthTokens`; includes auth token extraction for inter-process hand-off |
| `gui/server/routes/connect.ts` | `POST /start` SSE, `POST /disconnect` JSON, `GET /status` JSON | 73 | ✓ VERIFIED | All 3 handlers present; Zod validation on `/start`; exports `connectRouter` |
| `gui/server/index.ts` | Mounts `connectRouter` at `/api/connect` | — | ✓ VERIFIED | L10: import; L26: `app.use('/api/connect', connectRouter)` |
| `gui/client/src/components/ui/sonner.tsx` | shadcn-wrapped `Toaster` | — | ✓ VERIFIED | Substantive: full shadcn Toaster with theming, custom icons via lucide-react |
| `gui/client/src/App.tsx` | `<Toaster />` mounted at root; `/connect` route | — | ✓ VERIFIED | L9: Toaster import; L25: `<Toaster />`; L21: `<Route path="connect" element={<ConnectPage />} />` |
| `gui/client/src/pages/ConnectPage.tsx` | 4-step wizard component | 507 | ✓ VERIFIED | All 4 steps fully implemented per UI-SPEC; step indicator; SSE stream consumers for both auth and classify; device code callout; RBAC checkboxes; `noneSelected` guard disables Start Classification |
| `gui/client/src/components/layout/Sidebar.tsx` | Connect nav item + connection status footer | — | ✓ VERIFIED | L3: `PlugZap` import; L12: `/connect` nav item; L17–L32: status polling on mount and `entraops:connect-status` event; L88–L100: green/grey dot + tenant name or "Not connected" |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ConnectPage` step 1 submit | `POST /api/connect/start` | `fetch` SSE + `AbortController` | ✓ WIRED | `ConnectPage.tsx` L186 |
| `ConnectPage` step 3 "Start Classification" | `POST /api/commands/run` | `fetch` SSE with `Save-EntraOpsPrivilegedEAMJson` + `RbacSystems` | ✓ WIRED | `ConnectPage.tsx` L239–L244 |
| `ConnectPage` cancel (steps 1–2) | `POST /api/connect/disconnect` | `fetch` after aborting auth SSE | ✓ WIRED | `ConnectPage.tsx` L289 |
| `Sidebar` footer | `GET /api/connect/status` | `fetch` on mount + `entraops:connect-status` event listener | ✓ WIRED | `Sidebar.tsx` L23, L31 |
| `connect.ts` routes | `services/connect.ts` | `import { runConnect, disconnectEntraOps, getConnectionStatus, isConnecting }` | ✓ WIRED | `routes/connect.ts` L1–L8 |
| `server/index.ts` | `routes/connect.ts` | `app.use('/api/connect', connectRouter)` | ✓ WIRED | `index.ts` L10, L26 |
| `connect.ts` `runConnect()` | `pwsh Connect-EntraOps` | `spawn('pwsh', [...], { shell: false, cwd: REPO_ROOT })` | ✓ WIRED | `services/connect.ts` L104–L111; `shell: false` confirmed L110 |
| `connect.ts` connectionState | `{ connected: true, tenantName }` | Set only in `proc.on('close')` when `code === 0` | ✓ WIRED | `services/connect.ts` L121–L122 |
| `connect.ts` `disconnectEntraOps()` | `{ connected: false, tenantName: null }` | Always resets in both `close` and `error` handlers | ✓ WIRED | `services/connect.ts` L162–L166 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `ConnectPage.tsx` auth terminal | `authHtml` | SSE stream from `/api/connect/start` → `runConnect()` → `proc.stdout` | Yes — live pwsh stdout | ✓ FLOWING |
| `ConnectPage.tsx` classify terminal | `classifyHtml` | SSE stream from `/api/commands/run` → Phase 3 `runCommand()` | Yes — live pwsh stdout | ✓ FLOWING |
| `ConnectPage.tsx` device code callout | `deviceLoginUrl`, `deviceCode` | Extracted from `rawAuthOutput` via regex match on live auth stream | Yes — extracted from real Connect-EntraOps output | ✓ FLOWING |
| `ConnectPage.tsx` RBAC checkboxes | `selectedSystems` | Pre-populated from `/api/config` → `EntraOpsConfig.json` `RbacSystems`; default all-true | Yes — from real config or sensible default | ✓ FLOWING |
| `Sidebar.tsx` connection status footer | `connectStatus` | `GET /api/connect/status` → `getConnectionStatus()` → `connectionState` module variable | Yes — set from process exit code | ✓ FLOWING |

---

### Behavioral Spot-Checks

Human checkpoint 04-04 was approved by user — all browser verification checks passed. The checkpoint covered:

| Behavior | Method | Status |
|----------|--------|--------|
| Connect page accessible from sidebar (PlugZap icon) | Human browser | ✓ PASS |
| 4-step wizard renders with step indicator | Human browser | ✓ PASS |
| Auth stream runs; device code + URL appear in callout | Human browser (real tenant) | ✓ PASS |
| Classification streams after auth with RBAC selection | Human browser (real tenant) | ✓ PASS |
| Toast fires on completion with "Go to Dashboard" action | Human browser | ✓ PASS |
| Sidebar indicator shows connected state after wizard | Human browser | ✓ PASS |

Four PowerShell inter-process isolation bugs were discovered and fixed during this checkpoint (see commits f1a3b3a, 438ab16, e39d82c, 75847da). All confirmed resolved.

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CONN-01 | 04-02, 04-03, 04-04 | Connect page with tenant form, device code auth, and RBAC selection | ✓ SATISFIED | `ConnectPage.tsx` steps 0–2; sidebar nav wired |
| CONN-02 | 04-01, 04-03, 04-04 | Device code flow streams output in real time; connection state tracked server-side | ✓ SATISFIED | `services/connect.ts` `runConnect()`; SSE proxying in route; `connectionState` set on exit 0 |
| CONN-03 | 04-02, 04-03, 04-04 | Classification via `Save-EntraOpsPrivilegedEAMJson` with selected RBAC systems, streaming output | ✓ SATISFIED | `ConnectPage.tsx` L239 `POST /api/commands/run` with `RbacSystems`; reuses Phase 3 cmdlet runner |

**Note:** CONN requirements are not formally listed in `REQUIREMENTS.md` (v2 section has RUN, HIST, SETT — no CONN section). They were tracked via ROADMAP.md and CONTEXT.md only. Requirements traceability table in REQUIREMENTS.md should be updated to include CONN-01–03 in a future docs pass.

**Note:** CONN-04 (listed in ROADMAP.md requirements field) was deferred and not implemented in this phase — no plan claimed it, and no gap exists for it within Phase 4's defined scope.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ConnectPage.tsx` | 346 | `placeholder="contoso.onmicrosoft.com"` | ℹ️ Info | HTML input placeholder attribute — correct UX hint text, NOT a stub |

No stubs, TODO/FIXME comments, empty implementations, or hollow props found in any key file.

---

### Minor Documentation Discrepancy

`04-04-SUMMARY.md` documents the modified file as `gui/server/src/services/connectService.ts` — incorrect path. The actual file (verified in codebase) is `gui/server/services/connect.ts`. The bug fixes (commits f1a3b3a, 438ab16, e39d82c, 75847da) are confirmed in git history and the service implementation is correctly updated. Documentation-only discrepancy; no functional impact.

---

### Human Verification Required

None remaining. Human checkpoint 04-04 was approved prior to this verification. All interactive auth flow behaviors (device code display, auth→classify hand-off, toast, sidebar status) were confirmed working in a real browser against a real Entra tenant.

---

### Summary

Phase 4 goal achieved. All four success criteria are verified through code inspection and human checkpoint approval:

- The Connect page is properly wired from sidebar nav through to `/connect` route
- The 4-step wizard (Tenant → Authenticate → Review & Classify → Classifying) is fully implemented with 507 lines of substantive component code
- Auth streaming uses `shell: false` spawn with `psq()` escaping for PowerShell-level injection prevention; connection state gates on exit code 0 only
- Classification reuses the Phase 3 `/api/commands/run` route correctly with `RbacSystems` parameter
- Auth token forwarding (AlreadyAuthenticated env vars) solves the cross-process pwsh isolation problem discovered during human verification
- Sidebar status indicator polls live and responds to `entraops:connect-status` window events

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
