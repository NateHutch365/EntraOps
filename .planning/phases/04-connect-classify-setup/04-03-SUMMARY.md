# Plan 04-03 Summary: Connect Page UI + Sidebar

**Status:** Complete
**Commit:** 0ec2ffb

## What Was Built

Built the full user-facing Phase 4 UI: ConnectPage 4-step wizard, Sidebar Connect nav item + connection-status footer, and /connect route wiring.

## Key Files

### Created
- `gui/client/src/pages/ConnectPage.tsx` — 4-step wizard (Tenant → Authenticate → Review & Classify → Classifying)
- `gui/client/src/components/ui/label.tsx` — Radix Label wrapper (needed by form)
- `gui/client/src/components/ui/radio-group.tsx` — Radix RadioGroup wrapper (auth type selector)

### Modified
- `gui/client/src/components/layout/Sidebar.tsx` — Added PlugZap Connect nav item + connection status footer with polling
- `gui/client/src/App.tsx` — Added ConnectPage import and /connect route

## Technical Decisions

- **SSE parsing:** Used `

` frame splitting (matching server output format `data: {...}

`) for both auth and classify streams. This aligns with RunCommandsPage pattern for consistency.
- **Missing UI components:** Created `label.tsx` and `radio-group.tsx` as thin radix-ui wrappers following project shadcn pattern (same as checkbox.tsx).
- **Classify terminal height:** Wrapped classify TerminalOutput in `[&_pre]:h-96` override for taller output area during classification.
- **Sidebar status polling:** Uses `entraops:connect-status` window event listener (no interval polling) — event dispatched by ConnectPage on classify complete and cancel.

## Self-Check

- [x] ConnectPage exports ConnectPage function
- [x] All 4 wizard steps implemented per UI-SPEC
- [x] handleConnect → POST /api/connect/start SSE stream
- [x] handleStartClassify → POST /api/commands/run (Save-EntraOpsPrivilegedEAMJson)
- [x] handleCancel aborts SSE + calls /api/connect/disconnect (steps 1-2 only)
- [x] toast.success + entraops:connect-status event dispatched on classify complete
- [x] toast.error dispatched on classify failure
- [x] Auto-advance step 1→2 when authStatus transitions to 'completed'
- [x] Sidebar has PlugZap Connect nav item
- [x] Sidebar footer shows green/grey dot + tenant name or 'Not connected'
- [x] Sidebar listens for 'entraops:connect-status' event
- [x] App.tsx has /connect route → ConnectPage
- [x] TypeScript: zero errors (npx tsc --noEmit)
- [x] Committed: 0ec2ffb
