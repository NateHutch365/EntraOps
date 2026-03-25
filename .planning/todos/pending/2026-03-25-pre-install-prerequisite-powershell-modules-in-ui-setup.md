---
created: 2026-03-25T23:47:46.992Z
title: Pre-install prerequisite PowerShell modules in UI setup
area: ui
files:
  - gui/server/services/connect.ts
  - EntraOps/EntraOps.psd1:54-73
  - EntraOps/Public/Core/Connect-EntraOps.ps1:140-165
---

## Problem

`Connect-EntraOps` requires `Az.Accounts`, `Az.Resources`, and `Az.ResourceGraph` from the Az PowerShell module family. These are NOT auto-installed — the `RequiredModules` block in `EntraOps.psd1` is commented out, so the wizard silently fails with "The term 'Connect-AzAccount' is not recognized" when these modules are absent.

Currently the user must manually run `Install-Module Az.Accounts, Az.Resources, Az.ResourceGraph -Scope CurrentUser -Force` in a PowerShell session before the wizard works. There is no in-app guidance or pre-flight check.

Required modules and minimum versions (from `EntraOps.psd1`):
- `Az.Accounts` ≥ 2.19.0
- `Az.Resources` ≥ 6.16.2
- `Az.ResourceGraph` ≥ 0.13.1
- `Microsoft.Graph.Authentication` ≥ 2.18.0 (already installed)

## Solution

Add a module pre-flight check and optional install screen to the Connect wizard (Step 0 or a pre-wizard setup gate):

1. **Server-side**: New endpoint `GET /api/connect/prerequisites` — runs `Get-Module -ListAvailable Az.Accounts, Az.Resources, Az.ResourceGraph` and returns which are installed/missing with versions.
2. **Optional auto-install**: Endpoint `POST /api/connect/install-prerequisites` — streams `Install-Module <name> -Scope CurrentUser -Force` output via SSE (same pattern as connect/commands streaming). User can watch install progress in `TerminalOutput`.
3. **UI gate**: Before showing the tenant form (Step 1), check prerequisites. If any missing, show a "Setup Required" screen listing missing modules with an "Install Now" button that triggers the install stream. Once complete, proceed to Step 1.

Alternative (simpler): surface a clear error card at the start of Step 2 auth stream with a copy-pasteable `Install-Module` command rather than in-app install.
