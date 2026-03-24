# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** PowerShell Module with Layered Public/Private Function Architecture

**Key Characteristics:**
- PowerShell 7+ (Core) module (`EntraOps`) with explicit `Public`/`Private` function separation
- Analysis pipeline: authenticate → collect RBAC data via Graph/ARM APIs → classify against EAM definitions → persist as JSON or ingest to Sentinel
- Session-scoped state hashtable (`$__EntraOpsSession`) carries auth context, cache, and config across all functions
- CI/CD split: "Pull" workflow collects and commits classified data; "Push" workflow ingests that data downstream
- Enterprise Access Model (EAM) tiering (ControlPlane / ManagementPlane / WorkloadPlane / UserAccess) applied uniformly across all RBAC systems

## Layers

**Module Bootstrap:**
- Purpose: Load all functions, initialise session state, set global path variables
- Location: `EntraOps/EntraOps.psm1`
- Contains: Dot-source loader for Public + Private `.ps1` files, `$__EntraOpsSession` hashtable, persistent cache directory setup, `$EntraOpsBaseFolder` global variable
- Depends on: Nothing — this is the root
- Used by: All functions (inherits module scope variables)

**Core Layer:**
- Purpose: Authentication, API query wrappers, caching, module self-update
- Location: `EntraOps/Public/Core/`
- Contains: `Connect-EntraOps.ps1`, `Disconnect-EntraOps.ps1`, `Invoke-EntraOpsMsGraphQuery.ps1`, `Invoke-EntraOpsAzGraphQuery.ps1`, `Invoke-EntraOpsGraphSecurityQuery.ps1`, `Get-EntraOpsEntraObject.ps1`, `Push-EntraOpsLogsIngestionAPI.ps1`, `Clear-EntraOpsCache.ps1`, `Get-EntraOpsCacheStatistics.ps1`, `Install-EntraOpsAllRequiredModules.ps1`, `Update-EntraOps.ps1`
- Depends on: Module bootstrap, Az PowerShell, Microsoft Graph SDK
- Used by: All other layers

**Configuration Layer:**
- Purpose: Tenant onboarding, config file management, classification file synchronisation, workflow parameter generation
- Location: `EntraOps/Public/Configuration/`
- Contains: `New-EntraOpsConfigFile.ps1`, `New-EntraOpsWorkloadIdentity.ps1`, `Update-EntraOpsClassificationFiles.ps1`, `Update-EntraOpsRequiredWorkflowParameters.ps1`
- Depends on: Core layer, Graph API
- Used by: Operators at setup time and CI/CD Pull workflow

**Privileged Access Layer:**
- Purpose: EAM analysis — collect role assignments per RBAC system, classify against tier definitions, persist results
- Location: `EntraOps/Public/PrivilegedAccess/`
- Contains:
  - Collectors: `Get-EntraOpsPrivilegedEAM.ps1` (orchestrator), `Get-EntraOpsPrivilegedEAMEntraId.ps1`, `Get-EntraOpsPrivilegedEAMDefender.ps1`, `Get-EntraOpsPrivilegedEAMIdGov.ps1`, `Get-EntraOpsPrivilegedEAMIntune.ps1`, `Get-EntraOpsPrivilegedEAMResourceApps.ps1`, `Get-EntraOpsPrivilegedEAMResourceAppsFirstParty.ps1`
  - Role readers: `Get-EntraOpsPrivilegedEntraIdRoles.ps1`, `Get-EntraOpsPrivilegedAppRoles.ps1`, `Get-EntraOpsPrivilegedDefenderRoles.ps1`, `Get-EntraOpsPrivilegedDeviceRoles.ps1`, `Get-EntraOpsPrivilegedIdGovRoles.ps1`
  - Object resolution: `Get-EntraOpsPrivilegedEntraObject.ps1`, `Get-EntraOpsPrivilegedTransitiveGroupMember.ps1`
  - Classification export: `Export-EntraOpsClassificationDirectoryRoles.ps1`, `Export-EntraOpsClassificationAppRoles.ps1`, `Export-EntraOpsClassificationDeviceManagementRoles.ps1`
  - Persistence: `Save-EntraOpsPrivilegedEAMJson.ps1`, `Save-EntraOpsPrivilegedEAMWatchLists.ps1`, `Save-EntraOpsPrivilegedEAMInsightsCustomTable.ps1`, `Save-EntraOpsPrivilegedEAMEnrichmentToWatchLists.ps1`, `Expand-EntraOpsPrivilegedEamJsonFile.ps1`
  - Enforcement: `New-EntraOpsPrivilegedAdministrativeUnit.ps1`, `Update-EntraOpsPrivilegedAdministrativeUnit.ps1`, `New-EntraOpsPrivilegedConditionalAccessGroup.ps1`, `Update-EntraOpsPrivilegedConditionalAccessGroup.ps1`, `New-EntraOpsPrivilegedUnprotectedAdministrativeUnit.ps1`, `Update-EntraOpsPrivilegedUnprotectedAdministrativeUnit.ps1`, `Update-EntraOpsClassificationControlPlaneScope.ps1`
  - Query: `Get-EntraOpsClassificationControlPlaneObjects.ps1`
- Depends on: Core layer, Private layer, Classification JSON files
- Used by: CLI operators and Pull workflow

**Service Principals Layer:**
- Purpose: Workload identity analysis, managed identity assignment mapping, attack path evaluation, recommendations
- Location: `EntraOps/Public/ServicePrincipals/`
- Contains: `Get-EntraOpsWorkloadIdentityInfo.ps1`, `Get-EntraOpsWorkloadIdentityAttackPaths.ps1`, `Get-EntraOpsWorkloadIdentityRecommendations.ps1`, `Get-EntraOpsManagedIdentityAssignments.ps1`, `Save-EntraOpsWorkloadIdentityInfo.ps1`, `Save-EntraOpsWorkloadIdentityEnrichmentWatchLists.ps1`
- Depends on: Core layer, Graph API
- Used by: CLI operators and Push workflow

**Private Helpers:**
- Purpose: Shared internal logic extracted to eliminate duplication across EAM cmdlets
- Location: `EntraOps/Private/`
- Contains:
  - `New-EntraOpsEAMOutputObject.ps1` — builds standardised 20+ property output `PSCustomObject`
  - `Invoke-EntraOpsEAMClassificationAggregation.ps1` — aggregates classifications per unique object, handles parallel/sequential paths
  - `Invoke-EntraOpsParallelObjectResolution.ps1` — batch pre-fetches object details from Graph in parallel
  - `Resolve-EntraOpsClassificationPath.ps1` — tenant-specific → Templates fallback for classification JSON files
  - `Save-EntraOpsEAMRbacSystemJson.ps1` — writes aggregate + per-object JSON for one RBAC system with path safety checks
  - `Import-EntraOpsGlobalExclusions.ps1` — loads `Classification/Global.json` exclusion list
  - `Show-EntraOpsWarningSummary.ps1` — collects and displays deferred warning messages at end of run

## Data Flow

**Pull Workflow (Data Collection):**

1. GitHub Actions triggers `Pull-EntraOpsPrivilegedEAM.yaml` (scheduled or manual)
2. `Connect-EntraOps` authenticates via OIDC federated credentials to Az PowerShell and Microsoft Graph SDK
3. Optionally: `Update-EntraOpsClassificationFiles` syncs latest classification JSONs from `AzurePrivilegedIAM` repo
4. Optionally: `Update-EntraOpsClassificationControlPlaneScope` updates Control Plane scope definitions
5. `Save-EntraOpsPrivilegedEAMJson` orchestrates EAM collection per RBAC system:
   a. Calls per-system reader (`Get-EntraOpsPrivilegedEAMEntraId`, etc.)
   b. Each reader: fetches role assignments via Graph/ARM → resolves objects via `Invoke-EntraOpsParallelObjectResolution` → classifies via `Invoke-EntraOpsEAMClassificationAggregation` → builds output via `New-EntraOpsEAMOutputObject`
   c. `Save-EntraOpsEAMRbacSystemJson` writes `./PrivilegedEAM/{System}.json` + per-object JSON files
6. Git custom actions (`Git-Initialize`, `Git-Push`) commit and push JSON files to repo

**Push Workflow (Downstream Ingestion):**

1. Triggered on completion of Pull workflow
2. `Save-EntraOpsPrivilegedEAMWatchLists` uploads JSON to Microsoft Sentinel WatchLists via ARM API
3. `Save-EntraOpsPrivilegedEAMInsightsCustomTable` ingests JSON to Log Analytics custom table (`PrivilegedEAM_CL`) via `Push-EntraOpsLogsIngestionAPI` (Data Collection Rule / Data Collection Endpoint)

**Graph API Query Path:**

1. Caller invokes `Invoke-EntraOpsMsGraphQuery` with URI
2. Function checks `$__EntraOpsSession.GraphCache` (TTL-based in-memory cache)
3. Cache miss: calls Microsoft Graph via `Invoke-RestMethod` or `Invoke-MgGraphRequest` with retry/backoff on 429/503/504
4. Response stored in session cache with TTL metadata
5. Paginated responses automatically followed via `@odata.nextLink`

**State Management:**
- Session state: `$__EntraOpsSession` hashtable (module-scoped) — holds `GraphCache`, `CacheMetadata`, `PersistentCachePath`, `DefaultCacheTTL`, `StaticDataCacheTTL`
- Config state: `$EntraOpsConfig` global variable — loaded by `Connect-EntraOps` from `EntraOpsConfig.json`
- Path state: `$EntraOpsBaseFolder`, `$DefaultFolderClassification`, `$DefaultFolderClassifiedEam` — global PS variables set at connect time
- Auth context: Shared at process-level by Microsoft Graph SDK — allows parallel runspaces to reuse auth without re-authentication

## Key Abstractions

**EAM Output Object:**
- Purpose: Standardised classification result for any principal across any RBAC system
- Built by: `EntraOps/Private/New-EntraOpsEAMOutputObject.ps1`
- Pattern: `[PSCustomObject]` with fixed 20+ properties including `ObjectId`, `ObjectType`, `ObjectSubType`, `ObjectDisplayName`, `ObjectAdminTierLevel`, `ObjectAdminTierLevelName`, `OnPremSynchronized`, `RestrictedManagementByRAG`, `RestrictedManagementByAadRole`, `RestrictedManagementByRMAU`, `RoleSystem`, `Classification`, `RoleAssignments`, `Sponsors`, `Owners`, `OwnedObjects`, `OwnedDevices`, `IdentityParent`, `AssociatedWorkAccount`

**Classification File:**
- Purpose: JSON definition of EAM tier mappings per RBAC system (ControlPlane = Tier 0, ManagementPlane = Tier 1, WorkloadPlane = Tier 2, UserAccess = Tier 3)
- Examples: `Classification/Templates/Classification_AadResources.json`, `Classification/Templates/Classification_AppRoles.json`, `Classification/Templates/Classification_Defender.json`, `Classification/Templates/Classification_DeviceManagement.json`, `Classification/Templates/Classification_IdentityGovernance.json`
- Pattern: Resolved via `Resolve-EntraOpsClassificationPath` — checks `Classification/{TenantName}/` first, falls back to `Classification/Templates/`

**Session Cache:**
- Purpose: Avoid redundant Graph API calls within a single run
- Pattern: Hashtable keyed by request URI with TTL metadata; default 1-hour TTL, static data (role definitions) uses `StaticDataCacheTTL`; persistent disk cache at OS-appropriate path (macOS: `~/Library/Caches/EntraOps`, Windows: `%LOCALAPPDATA%\EntraOps`)

**RBAC System:**
- Purpose: Logical grouping of role assignment analysis (`EntraID`, `IdentityGovernance`, `DeviceManagement`, `ResourceApps`, `Defender`)
- Pattern: Each system has a dedicated `Get-EntraOpsPrivilegedEAM{System}.ps1` collector fed by one or more role reader functions

## Entry Points

**Interactive / On-Demand:**
- Function: `Connect-EntraOps`
- Location: `EntraOps/Public/Core/Connect-EntraOps.ps1`
- Triggers: Manual PowerShell session setup
- Responsibilities: Authenticate to Az PowerShell + Microsoft Graph; load config file into `$EntraOpsConfig`; set global path variables; display welcome banner

**Orchestrated Data Collection:**
- Function: `Save-EntraOpsPrivilegedEAMJson`
- Location: `EntraOps/Public/PrivilegedAccess/Save-EntraOpsPrivilegedEAMJson.ps1`
- Triggers: Pull workflow (`Pull-EntraOpsPrivilegedEAM.yaml`) or manual call
- Responsibilities: Collect EAM data for all configured RBAC systems; write JSON output; manages cache TTL lifecycle

**In-Memory Analysis:**
- Function: `Get-EntraOpsPrivilegedEAM`
- Location: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAM.ps1`
- Triggers: Direct call when the caller needs data in-memory rather than persisted
- Responsibilities: Run all per-system EAM collectors and return combined result array

**GitHub Workflows:**
- Pull: `.github/workflows/Pull-EntraOpsPrivilegedEAM.yaml` — scheduled, collects and commits data
- Push: `.github/workflows/Push-EntraOpsPrivilegedEAM.yaml` — triggered by Pull completion, ingests downstream
- Update: `.github/workflows/Update-EntraOps.yaml` — self-update of the module

## Error Handling

**Strategy:** `$ErrorActionPreference = "Stop"` set at module load and in public functions; most errors terminate immediately; Graph 404s (`ResourceNotFound`) are caught and handled as `$null` objects

**Patterns:**
- Graph connectivity errors (429/503/504): Automatic retry with exponential backoff and `Retry-After` header respect in `Invoke-EntraOpsMsGraphQuery`
- Classification file missing: `Resolve-EntraOpsClassificationPath` calls `Write-Error` (terminating) with guidance to run `Update-EntraOpsClassificationFiles`
- Export path safety: `Save-EntraOpsEAMRbacSystemJson` validates `ExportFolder` is under `$EntraOpsBaseFolder` before any destructive operations
- Warnings collected during parallel runs via `System.Collections.Generic.List[psobject]` and displayed at completion by `Show-EntraOpsWarningSummary`

## Cross-Cutting Concerns

**Caching:** TTL-based in-memory cache via `$__EntraOpsSession.GraphCache`; `Clear-EntraOpsCache` and `Get-EntraOpsCacheStatistics` provide management; each public function that takes `ClearCache` / `UseCache` parameters controls per-invocation behavior

**Parallel Processing:** `ForEach-Object -Parallel` (PowerShell 7+ native); throttle limit configurable via `-ParallelThrottleLimit` (default 10); uses `[System.Collections.Hashtable]::Synchronized()` for shared state; disabled automatically when object count < 50 (threshold in `Invoke-EntraOpsEAMClassificationAggregation`)

**Authentication:** Six modes supported (`UserInteractive`, `SystemAssignedMSI`, `UserAssignedMSI`, `FederatedCredentials`, `AlreadyAuthenticated`, `DeviceAuthentication`) all handled in `Connect-EntraOps`; Graph SDK's process-level auth context enables parallel runspace reuse

**Configuration:** `EntraOpsConfig.json` (not committed — generated by `New-EntraOpsConfigFile`) drives all optional behaviours; loaded into `$EntraOpsConfig` global variable at connect time; splatted directly to cmdlets (`@SentinelWatchListsParams`)

---

*Architecture analysis: 2026-03-24*
