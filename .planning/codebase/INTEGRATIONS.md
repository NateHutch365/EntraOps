# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**Microsoft Graph API:**
- Service: Microsoft Graph (Entra ID / M365)
  - Base URIs: `https://graph.microsoft.com/beta/` and `https://graph.microsoft.com/v1.0/`
  - SDK/Client: `Microsoft.Graph.Authentication` (`Invoke-MgGraphRequest`) or fallback `Invoke-RestMethod`
  - Wrapper: `Invoke-EntraOpsMsGraphQuery` in `EntraOps/Public/Core/Invoke-EntraOpsMsGraphQuery.ps1`
  - Auth: Bearer token via `Connect-MgGraph` (SDK) or `Get-AzAccessToken` (REST fallback)
  - Features used: Entra ID directory roles, transitive role assignments, PIM eligible schedules, App registrations, Administrative Units, Conditional Access, Identity Governance (Entitlement Management), Entra Recommendations, user/group/SP object resolution
  - Required scopes (requested at connect): `Directory.Read.All`, `RoleManagement.Read.All`, `Application.Read.All`, `AdministrativeUnit.Read.All`, `EntitlementManagement.Read.All`, `Group.Read.All`, `User.Read.All`, `Policy.Read.All`, `PrivilegedAccess.Read.AzureADGroup`, `PrivilegedEligibilitySchedule.Read.AzureADGroup`, `CustomSecAttributeAssignment.Read.All`, `DeviceManagementConfiguration.Read.All`, `DeviceManagementManagedDevices.Read.All`, `DeviceManagementRBAC.Read.All`, `DeviceManagementServiceConfig.Read.All`, `DirectoryRecommendations.Read.All`, `ThreatHunting.Read.All`

**Microsoft 365 Defender / Defender XDR Advanced Hunting:**
- Service: Microsoft Security Graph endpoint
  - URI: `https://graph.microsoft.com/beta/security/runHuntingQuery`
  - Client: `Invoke-EntraOpsMsGraphQuery` with `POST` method
  - Wrapper: `Invoke-EntraOpsGraphSecurityQuery` in `EntraOps/Public/Core/Invoke-EntraOpsGraphSecurityQuery.ps1`
  - Auth: Same Graph bearer token, requires `ThreatHunting.Read.All` scope
  - Used for: Fetching Defender role assignments in `Get-EntraOpsPrivilegedEAMDefender` (`EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMDefender.ps1`)

**Azure Resource Manager (ARM):**
- Service: Azure Resource Management
  - Base URI: `https://management.azure.com/`
  - SDK/Client: `Az.Accounts` (`Get-AzAccessToken`, `Connect-AzAccount`, `Set-AzContext`), `Az.Resources`
  - Auth: `Connect-AzAccount` (interactive) or OIDC federated token (CI/CD)
  - Used for: Subscription/tenant context, Administrative Unit management, Data Collection Rule lookup for Logs Ingestion API, Sentinel WatchList management

**Azure Resource Graph:**
- Service: Azure Resource Graph
  - Client: `Az.ResourceGraph` (`Search-AzGraph`)
  - Wrapper: `Invoke-EntraOpsAzGraphQuery` in `EntraOps/Public/Core/Invoke-EntraOpsAzGraphQuery.ps1`
  - Auth: Current `Az` context
  - Used for: Defender for Cloud attack path queries (`Get-EntraOpsWorkloadIdentityAttackPaths`), Azure billing role assignments, tenant-scoped resource queries (`-UseTenantScope`)

**GitHub API & Git:**
- Service: GitHub REST API + git CLI
  - Classification templates URI: `https://api.github.com/repos/Cloud-Architekt/AzurePrivilegedIAM/contents/EntraOps_Classification`
  - Self-update clone URI: `https://github.com/Cloud-Architekt/EntraOps.git`
  - Client: `Invoke-RestMethod` (for API) and `git clone` (for self-update)
  - Used in: `Update-EntraOpsClassificationFiles` (`EntraOps/Public/Configuration/Update-EntraOpsClassificationFiles.ps1`), `Update-EntraOps` (`EntraOps/Public/Core/Update-EntraOps.ps1`)
  - Optional PAT via `$PersonalAccessToken` parameter for private forks

## Data Storage

**Databases:**
- None — no traditional database. All structured data is stored as JSON files or pushed to Azure services.

**File Storage:**
- Local filesystem — primary classification output stored as JSON under `./PrivilegedEAM/` (configurable via `$DefaultFolderClassifiedEam`)
- Classification definitions stored under `./Classification/` and `./Classification/Templates/`
- Persistent API response cache stored on disk at cross-platform path resolved in `EntraOps.psm1`:
  - Windows: `%LOCALAPPDATA%\EntraOps\`
  - macOS: `~/Library/Caches/EntraOps/`
  - Linux: `~/.cache/EntraOps/` (or `$XDG_CACHE_HOME/EntraOps/`)
- GitHub repository used as the output store for committed EAM JSON files (Pull workflow pushes results back via `GITHUB_TOKEN`)

**Caching:**
- In-memory session cache in `$__EntraOpsSession.GraphCache` (hashtable keyed by Graph URI)
- Disk-based persistent cache at `$__EntraOpsSession.PersistentCachePath`
- TTL: 3600 seconds default, overridable per `Get-EntraOpsPrivilegedEAM` call via `-DefaultCacheTTL` / `-StaticDataCacheTTL`

## Authentication & Identity

**Auth Provider:** Microsoft Entra ID (Azure AD) — multi-mode

**Authentication modes (set via `-AuthenticationType` on `Connect-EntraOps`):**
- `FederatedCredentials` — GitHub OIDC → Azure App Registration federated credential (primary CI/CD mode); uses `azure/login@v2` action
- `AlreadyAuthenticated` — reuses existing `Az` context, derives Graph token via `Get-AzAccessToken`
- `UserInteractive` — `Connect-AzAccount` + `Connect-MgGraph` with interactive browser login
- `SystemAssignedMSI` — System Assigned Managed Identity
- `UserAssignedMSI` — User Assigned Managed Identity; takes `-AccountId` (MSI client ID)
- `DeviceAuthentication` — device code flow for headless environments

**Workload Identity Setup:**
- `New-EntraOpsWorkloadIdentity` (`EntraOps/Public/Configuration/New-EntraOpsWorkloadIdentity.ps1`) creates App Registrations with required Graph permissions and optional federated credentials for GitHub branches/environments

## Monitoring & Observability

**Azure Monitor / Log Analytics — Logs Ingestion API:**
- Service: Azure Monitor Logs Ingestion API
  - Endpoint derived from Data Collection Endpoint (DCE) associated with DCR
  - Auth: Bearer token via `Get-AzAccessToken -ResourceUrl "https://monitor.azure.com/"`
  - Wrapper: `Push-EntraOpsLogsIngestionAPI` in `EntraOps/Public/Core/Push-EntraOpsLogsIngestionAPI.ps1`
  - Default custom table: `PrivilegedEAM_CL`
  - Config parameters: `DataCollectionRuleName`, `DataCollectionResourceGroupName`, `DataCollectionRuleSubscriptionId`, `TableName`
  - Used by: `Save-EntraOpsPrivilegedEAMInsightsCustomTable` (`EntraOps/Public/PrivilegedAccess/Save-EntraOpsPrivilegedEAMInsightsCustomTable.ps1`)

**Microsoft Sentinel WatchLists:**
- Service: Microsoft Sentinel (Log Analytics workspace)
  - API: ARM-based Sentinel WatchList API
  - Auth: Current `Az` context
  - Wrapper: `Save-EntraOpsPrivilegedEAMWatchLists` (`EntraOps/Public/PrivilegedAccess/Save-EntraOpsPrivilegedEAMWatchLists.ps1`)
  - WatchList prefix: `EntraOps_` (configurable)
  - Optional WatchList templates: `VIPUsers`, `HighValueAssets`, `IdentityCorrelation`
  - Optional workload identity WatchLists: `WorkloadIdentityInfo`, `WorkloadIdentityAttackPaths`, `WorkloadIdentityRecommendations`, `ManagedIdentityAssignedResourceId`
  - Config parameters: `SentinelSubscriptionId`, `SentinelResourceGroupName`, `SentinelWorkspaceName`

**Logs:**
- `Write-Verbose` throughout for detailed trace output
- `Write-Host` with colour for pipeline stage progress (Cyan headers)
- `Write-Warning` for non-fatal issues aggregated in `$WarningMessages` lists, surfaced at end via `Show-EntraOpsWarningSummary` (`EntraOps/Private/Show-EntraOpsWarningSummary.ps1`)
- No external logging service

**Error Tracking:**
- None (no Application Insights or external error tracking)

## Azure Entra ID Features (PIM)

**Microsoft Entra PIM (Privileged Identity Management):**
- Eligible role assignments queried via Graph API: `/beta/roleManagement/directory/transitiveRoleAssignments`
- PIM for Groups: `PrivilegedAccess.Read.AzureADGroup`, `PrivilegedEligibilitySchedule.Read.AzureADGroup`
- Used in: `Get-EntraOpsPrivilegedEAMEntraId`, `Get-EntraOpsPrivilegedEntraIdRoles`, `Get-EntraOpsPrivilegedIdGovRoles`

## CI/CD & Deployment

**Hosting:**
- GitHub — repository stores EAM JSON output, classification definitions, workflows, and module code

**CI Pipeline:**
Three GitHub Actions workflows in `.github/workflows/`:

1. `Pull-EntraOpsPrivilegedEAM.yaml` — scheduled/manual; fetches EAM data via `Save-EntraOpsPrivilegedEAMJson`; commits JSON output back to repo via `.github/actions/Git-Push`
2. `Push-EntraOpsPrivilegedEAM.yaml` — triggered on Pull workflow completion; ingests to Log Analytics / Sentinel WatchLists; applies Administrative Unit and Conditional Access Group assignments
3. `Update-EntraOps.yaml` — scheduled/manual; self-updates module and workflow files from upstream `Cloud-Architekt/EntraOps` via `Update-EntraOps`

All workflows use `azure/login@v2` with OIDC (`id-token: write` permission) and `azure/powershell@v2` for PowerShell steps.

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- GitHub Actions writes back to repository via `GITHUB_TOKEN` (git push)
- Data pushed to Azure Monitor Logs Ingestion endpoint (outbound HTTP POST)
- Sentinel WatchList updates via ARM API (outbound HTTP)

## Environment Configuration

**Required env vars / config (set in workflow `env:` block or `EntraOpsConfig.json`):**
- `ClientId` — App Registration client ID for OIDC authentication
- `TenantId` — Azure AD tenant ID
- `TenantName` — Tenant domain (e.g., `contoso.onmicrosoft.com`), used in `Connect-EntraOps -TenantName`
- `ConfigFile` — path to `EntraOpsConfig.json` (default `./EntraOpsConfig.json`)

**Secrets location:**
- GitHub Actions secrets / OIDC — no static secrets stored; federated credentials used
- Optional PAT for private fork updates passed as parameter, never stored in config file

---

*Integration audit: 2026-03-24*
