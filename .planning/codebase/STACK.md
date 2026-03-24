# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- PowerShell 7.1+ (Core) — entire module, all automation scripts, GitHub Actions inline scripts

**Secondary:**
- KQL (Kusto Query Language) — parsers in `Parsers/`, workbook queries, Advanced Hunting queries
- JSON — classification definition files in `Classification/`, workbook definitions in `Workbooks/`, config files
- YAML — GitHub Actions workflows in `.github/workflows/`, parser YAML definitions in `Parsers/`, query samples in `Queries/`

## Runtime

**Environment:**
- PowerShell 7.0+ (Core / `pwsh`) — enforced at module load in `EntraOps/EntraOps.psm1` (throws if < 7)
- Cross-platform: Windows (`%LOCALAPPDATA%\EntraOps`), macOS (`~/Library/Caches/EntraOps`), Linux (`~/.cache/EntraOps`)

**Package Manager:**
- PowerShell Gallery (`Install-Module`) — managed via `Install-EntraOpsRequiredModule` and `Install-EntraOpsAllRequiredModules`
- No lockfile — minimum versions enforced in code

## Frameworks / Module Type

**Core:**
- PowerShell Module (`EntraOps.psm1` / `EntraOps.psd1`) v`0.6.0`
- Module Edition: `Core` only (set in `CompatiblePSEditions`)
- Auto-loads all `.ps1` from `EntraOps/Public/**` and `EntraOps/Private/` via dot-sourcing

**Dev Container:**
- Dockerfile-based devcontainer at `.devcontainer/devcontainer.json`
- Default terminal: `pwsh`
- VS Code extension pre-installed: `ms-vscode.powershell`

**CI/CD:**
- GitHub Actions (`ubuntu-latest` runners)
- `azure/login@v2` for OIDC federation
- `azure/powershell@v2` for inline PowerShell execution

## Key Dependencies

**Critical (must be installed — enforced by `Install-EntraOpsAllRequiredModules`):**
- `Az.Accounts` ≥ `2.19.0` — Azure authentication, access token acquisition (`Get-AzAccessToken`), context management
- `Az.Resources` ≥ `6.16.2` — Azure Resource Manager operations, Administrative Unit and role management
- `Az.ResourceGraph` ≥ `0.13.1` — Azure Resource Graph queries via `Search-AzGraph` (used in `Invoke-EntraOpsAzGraphQuery`)
- `Microsoft.Graph.Authentication` ≥ `2.18.0` — Microsoft Graph SDK auth, `Invoke-MgGraphRequest`, `Connect-MgGraph`

**Optional (fallback mode):**
- `Invoke-RestMethod` only mode (`-UseInvokeRestMethodOnly` switch on `Connect-EntraOps`) — bypasses Graph SDK, uses raw REST calls with `Az`-sourced bearer tokens

## Configuration

**Environment / Config:**
- `EntraOpsConfig.json` (default: `./EntraOpsConfig.json`) — main config file, created by `New-EntraOpsConfigFile`; loaded at connect time; drives all optional automation (Log Analytics, WatchLists, PIM scope updates, AU management)
- `Classification/Global.json` — global exclusion list applied to all RBAC classifications
- `Classification/*.json` — per-system classification files (EntraID, DeviceManagement, Defender, etc.)
- `Classification/Templates/` — template classification files synced from upstream GitHub repo `Cloud-Architekt/AzurePrivilegedIAM`

**Build / Session State:**
- No build step — PowerShell module imported directly via `Import-Module ./EntraOps`
- Session state stored in `$__EntraOpsSession` (script-scope hashtable) initialized in `EntraOps.psm1`:
  - `GraphCache` — in-memory dictionary keyed by Graph URI
  - `CacheMetadata` — TTL tracking per cache entry
  - `PersistentCachePath` — cross-platform path to disk cache directory
  - `DefaultCacheTTL` — 3600 seconds (1 hour)
  - `StaticDataCacheTTL` — 3600 seconds (1 hour)
- Global variable `$EntraOpsBaseFolder` — set to parent of module root, used throughout for default path resolution

## Platform Requirements

**Development:**
- PowerShell 7.0+ (`pwsh`)
- Internet access to PowerShell Gallery and Microsoft APIs
- Azure subscription with appropriate RBAC and Entra ID tenant
- Optional: Docker for devcontainer (`.devcontainer/`)

**Production / CI:**
- GitHub Actions (Ubuntu runner)
- Azure App Registration with Federated Credential (GitHub OIDC) or Managed Identity
- Log Analytics / Microsoft Sentinel workspace (optional, for data ingestion)
- Data Collection Rule + Endpoint (optional, for Logs Ingestion API)

## KQL Artifacts

- `Parsers/PrivilegedEAM_CustomTable.yaml` / `.json` — standardises schema from `PrivilegedEAM_CL` custom table
- `Parsers/PrivilegedEAM_WatchLists.yaml` / `.json` — standardises schema from Sentinel WatchLists
- `Queries/PowerShell/PrivilegedEAM.yaml` — sample PowerShell-based query library
- `Workbooks/` — three Azure Monitor workbook JSON definitions (Overview, Workload Identities, Agent Identities)

---

*Stack analysis: 2026-03-24*
