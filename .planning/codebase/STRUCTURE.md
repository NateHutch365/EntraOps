# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
EntraOps/                                   # Repository root
├── EntraOps/                               # PowerShell module root
│   ├── EntraOps.psd1                       # Module manifest (version, exports, metadata)
│   ├── EntraOps.psm1                       # Module loader + session state initialisation
│   ├── Public/                             # Exported functions (51 total)
│   │   ├── Configuration/                  # Setup, onboarding, classification sync
│   │   ├── Core/                           # Auth, API queries, caching, module updates
│   │   ├── PrivilegedAccess/               # EAM analysis, classification, persistence, enforcement
│   │   └── ServicePrincipals/              # Workload identity analysis
│   └── Private/                            # Internal helper functions (not exported)
├── Classification/                         # EAM classification definitions
│   ├── Global.json                         # Global principal exclusion list
│   └── Templates/                          # Default classification JSONs (all RBAC systems)
├── Parsers/                                # KQL parser definitions for Log Analytics
├── Queries/                                # Saved query files
│   └── PowerShell/                         # PowerShell-based query definitions (YAML)
├── Samples/                                # Sample/reference data for offline testing
├── Workbooks/                              # Azure Monitor Workbook definitions
├── .github/                                # GitHub-specific configuration
│   ├── actions/                            # Reusable composite actions
│   │   ├── Git-Initialize/                 # Composite: init git identity for workflows
│   │   ├── Git-PullRequest/                # Composite: open PR from workflow
│   │   └── Git-Push/                       # Composite: commit and push from workflow
│   ├── agents/                             # GitHub Copilot agent instruction files
│   └── workflows/                          # GitHub Actions CI/CD workflows
├── .devcontainer/                          # Dev container configuration (Dockerfile + devcontainer.json)
├── .planning/                              # GSD planning documents (not committed by default)
│   └── codebase/                           # Codebase analysis documents
├── EntraOpsConfig.json                     # (Generated — not committed) Runtime config file
├── CHANGELOG.md                            # Version history
├── README.md                               # Project documentation
├── SECURITY.md                             # Security policy
├── GUI-PRD.md                              # GUI product requirements document
└── IMPLEMENTATION_GUIDE.md                 # Implementation and setup guide
```

## Directory Purposes

**`EntraOps/Public/Core/`:**
- Purpose: Foundational functions needed by all other layers
- Contains: Authentication (`Connect-EntraOps.ps1`, `Disconnect-EntraOps.ps1`), API query wrappers (`Invoke-EntraOpsMsGraphQuery.ps1`, `Invoke-EntraOpsAzGraphQuery.ps1`, `Invoke-EntraOpsGraphSecurityQuery.ps1`), object lookup (`Get-EntraOpsEntraObject.ps1`), Log Analytics ingestion (`Push-EntraOpsLogsIngestionAPI.ps1`), cache management (`Clear-EntraOpsCache.ps1`, `Get-EntraOpsCacheStatistics.ps1`), module install/update (`Install-EntraOpsAllRequiredModules.ps1`, `Install-EntraOpsRequiredModule.ps1`, `Update-EntraOps.ps1`)

**`EntraOps/Public/Configuration/`:**
- Purpose: One-time setup and ongoing maintenance operations
- Contains: `New-EntraOpsConfigFile.ps1`, `New-EntraOpsWorkloadIdentity.ps1`, `Update-EntraOpsClassificationFiles.ps1`, `Update-EntraOpsRequiredWorkflowParameters.ps1`
- Key files: `New-EntraOpsConfigFile.ps1` generates `EntraOpsConfig.json` in the repo root

**`EntraOps/Public/PrivilegedAccess/`:**
- Purpose: Core EAM analysis — collection, classification, persistence, and enforcement
- Contains: Per-system EAM collectors, role readers, classification exporters, JSON/WatchList/CustomTable savers, AU and CA group enforcement functions
- Key files: `Get-EntraOpsPrivilegedEAM.ps1` (in-memory orchestrator), `Save-EntraOpsPrivilegedEAMJson.ps1` (file persistence orchestrator)

**`EntraOps/Public/ServicePrincipals/`:**
- Purpose: Workload identity-specific analysis beyond EAM role classification
- Contains: `Get-EntraOpsWorkloadIdentityInfo.ps1`, `Get-EntraOpsWorkloadIdentityAttackPaths.ps1`, `Get-EntraOpsWorkloadIdentityRecommendations.ps1`, `Get-EntraOpsManagedIdentityAssignments.ps1`, `Save-EntraOpsWorkloadIdentityInfo.ps1`, `Save-EntraOpsWorkloadIdentityEnrichmentWatchLists.ps1`

**`EntraOps/Private/`:**
- Purpose: Shared internal helpers — not exported, only callable within module scope
- Key files:
  - `New-EntraOpsEAMOutputObject.ps1` — standardised output object factory
  - `Invoke-EntraOpsEAMClassificationAggregation.ps1` — classification aggregation with parallel support
  - `Invoke-EntraOpsParallelObjectResolution.ps1` — batch Graph object pre-fetch
  - `Resolve-EntraOpsClassificationPath.ps1` — tenant-specific → Templates path resolution
  - `Save-EntraOpsEAMRbacSystemJson.ps1` — safe RBAC system JSON writer
  - `Import-EntraOpsGlobalExclusions.ps1` — loads `Classification/Global.json`
  - `Show-EntraOpsWarningSummary.ps1` — deferred warning display

**`Classification/`:**
- Purpose: EAM tier assignment definitions consumed during role classification
- `Classification/Global.json` — excluded principal IDs (e.g., break-glass accounts)
- `Classification/Templates/` — default per-system JSON files sourced from the `AzurePrivilegedIAM` GitHub repository:
  - `Classification_AadResources.json` — Entra ID (AAD) role action → tier mappings
  - `Classification_AadResources.Param.json` — parameters for AAD classification
  - `Classification_AppRoles.json` — Application role → tier mappings
  - `Classification_Defender.json` — Microsoft Defender role → tier mappings
  - `Classification_DeviceManagement.json` — Intune/device management role → tier mappings
  - `Classification_IdentityGovernance.json` — Identity Governance role → tier mappings
- Tenant-specific overrides: place custom JSON at `Classification/{TenantName}/{filename}` to override templates

**`Parsers/`:**
- Purpose: KQL parser definitions for querying EAM data in Log Analytics / Microsoft Sentinel
- `PrivilegedEAM_CustomTable.json`, `PrivilegedEAM_CustomTable.yaml` — parser for custom log table
- `PrivilegedEAM_WatchLists.json`, `PrivilegedEAM_WatchLists.yaml` — parser for WatchList data

**`Workbooks/`:**
- Purpose: Azure Monitor Workbook definitions for interactive dashboards in the Azure Portal
- `EntraOps Privileged EAM - Overview.json` / `.workbook` — main overview dashboard
- `EntraOps Privileged EAM - Agent Identities.json` / `.workbook` — agent identity view
- `EntraOps Privileged EAM - Workload Identities.json` / `.workbook` — workload identity view
- Note: Each workbook exists as both `.json` (ARM template) and `.workbook` (native format)

**`Queries/PowerShell/`:**
- Purpose: Saved PowerShell query definitions in YAML format
- `PrivilegedEAM.yaml` — reusable query definitions for EAM data retrieval

**`Samples/`:**
- Purpose: Reference/sample data for offline testing and SampleMode execution
- `AzBillingRoleAssignments.json` — sample Azure Billing role assignment data

**`.github/workflows/`:**
- `Pull-EntraOpsPrivilegedEAM.yaml` — scheduled collection pipeline: authenticate → (optionally) sync classifications → collect EAM → commit JSON to repo
- `Push-EntraOpsPrivilegedEAM.yaml` — ingestion pipeline: triggered by Pull completion → ingest to Sentinel WatchLists and/or Log Analytics
- `Update-EntraOps.yaml` — module self-update workflow

**`.github/actions/`:**
- Reusable composite actions called within the main workflows
- `Git-Initialize/` — sets git user identity for workflow commits
- `Git-PullRequest/` — creates a pull request from workflow-generated changes
- `Git-Push/` — stages, commits, and pushes changes to the repo

**`.github/agents/`:**
- `entraops.qa.agent.md` — GitHub Copilot custom agent instructions for QA tasks
- `entraops.report.agent.md` — GitHub Copilot custom agent instructions for reporting tasks

## Key File Locations

**Entry Points:**
- `EntraOps/Public/Core/Connect-EntraOps.ps1`: Session initialisation, authentication, config loading
- `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAM.ps1`: In-memory EAM data collection orchestrator
- `EntraOps/Public/PrivilegedAccess/Save-EntraOpsPrivilegedEAMJson.ps1`: File-persistence EAM orchestrator

**Configuration:**
- `EntraOps/EntraOps.psd1`: Module manifest — version (`0.6.0`), GUID, exported function list, PS version requirement (`7.1`)
- `EntraOps/EntraOps.psm1`: Module loader — session state init, cache path setup, global variable definitions
- `EntraOpsConfig.json`: (Runtime — generated by `New-EntraOpsConfigFile`, NOT committed) — tenant name, auth type, ingest targets, classification settings
- `Classification/Global.json`: Global principal exclusions

**Core Logic:**
- `EntraOps/Private/New-EntraOpsEAMOutputObject.ps1`: Output object schema definition
- `EntraOps/Private/Invoke-EntraOpsEAMClassificationAggregation.ps1`: Classification engine
- `EntraOps/Public/Core/Invoke-EntraOpsMsGraphQuery.ps1`: Graph API client with caching, pagination, retry
- `EntraOps/Private/Resolve-EntraOpsClassificationPath.ps1`: Classification file resolver
- `EntraOps/Private/Save-EntraOpsEAMRbacSystemJson.ps1`: Safe JSON persistence with path guard

**CI/CD:**
- `.github/workflows/Pull-EntraOpsPrivilegedEAM.yaml`: Primary scheduled collection workflow
- `.github/workflows/Push-EntraOpsPrivilegedEAM.yaml`: Downstream ingestion workflow

## Naming Conventions

**Files:**
- Public functions: `{Verb}-{Module}{Noun}.ps1` — verb matches the PowerShell standard (`Get-`, `Save-`, `New-`, `Update-`, `Export-`, `Push-`, `Clear-`, `Connect-`, `Disconnect-`, `Install-`, `Expand-`, `Invoke-`)
- Examples: `Get-EntraOpsPrivilegedEAM.ps1`, `Save-EntraOpsPrivilegedEAMWatchLists.ps1`
- Private functions: Same pattern, no verb restriction
- Classification files: `Classification_{System}.json` (e.g., `Classification_Defender.json`)
- Workflow files: `{Verb}-{Module}{Noun}.yaml` matching the workflow name
- Workbook files: `EntraOps {Feature} - {Variant}.json` / `.workbook`

**Functions:**
- All public functions prefixed `EntraOps` after the verb: `Get-EntraOpsPrivilegedEAM`, `Save-EntraOpsPrivilegedEAMJson`
- EAM per-system functions follow `Get-EntraOpsPrivilegedEAM{System}`: `Get-EntraOpsPrivilegedEAMEntraId`, `Get-EntraOpsPrivilegedEAMDefender`, etc.
- Private helpers use same convention: `Invoke-EntraOpsEAMClassificationAggregation`, `New-EntraOpsEAMOutputObject`

**Variables:**
- Global PS variables: PascalCase with module prefix — `$EntraOpsBaseFolder`, `$EntraOpsConfig`, `$DefaultFolderClassification`, `$DefaultFolderClassifiedEam`
- Session hashtable: `$__EntraOpsSession` (double-underscore prefix indicates module-internal)
- Parameters: PascalCase — `$TenantName`, `$RbacSystems`, `$EnableParallelProcessing`
- Local variables: PascalCase — `$UniqueObjects`, `$ObjectDetailsCache`, `$ResolvedExportFolder`

**Directories:**
- Module sub-directories: PascalCase matching functional grouping (`Core`, `Configuration`, `PrivilegedAccess`, `ServicePrincipals`)
- Top-level non-module: PascalCase (`Classification`, `Parsers`, `Workbooks`, `Samples`, `Queries`)
- Hidden/tooling: lowercase with dot prefix (`.github`, `.devcontainer`, `.planning`)

## Where to Add New Code

**New EAM RBAC System collector:**
- Implementation: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAM{NewSystem}.ps1`
- Role reader: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAM{NewSystem}Roles.ps1` (if needed)
- Classification file: `Classification/Templates/Classification_{NewSystem}.json`
- Wire up: Add system name to the `ValidateSet` in `Get-EntraOpsPrivilegedEAM.ps1` and `Save-EntraOpsPrivilegedEAMJson.ps1`; add function name to `FunctionsToExport` in `EntraOps/EntraOps.psd1`

**New Core API helper:**
- Implementation: `EntraOps/Public/Core/{Verb}-EntraOps{Noun}.ps1`
- Export: Add to `FunctionsToExport` array in `EntraOps/EntraOps.psd1`

**New private shared helper:**
- Implementation: `EntraOps/Private/{Verb}-EntraOps{Noun}.ps1`
- No export needed — automatically dot-sourced by `EntraOps.psm1`

**New Configuration function:**
- Implementation: `EntraOps/Public/Configuration/{Verb}-EntraOps{Noun}.ps1`
- Export: Add to `FunctionsToExport` in `EntraOps/EntraOps.psd1`

**New Workbook:**
- Add both `.json` (ARM template) and `.workbook` (native) formats to `Workbooks/`
- Follow naming: `EntraOps {Feature} - {Variant}.json` / `.workbook`

**New classification template:**
- Add to `Classification/Templates/Classification_{System}.json`
- Tenant-specific overrides: `Classification/{TenantName}/Classification_{System}.json`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents (phases, plans, codebase analysis)
- Generated: No
- Committed: Not by default — add to `.gitignore` if not tracking planning docs

**`EntraOps/Private/`:**
- Purpose: Internal module helpers — only accessible within module scope
- Generated: No
- Committed: Yes

**`.devcontainer/`:**
- Purpose: Docker-based development environment for consistent PowerShell 7 setup
- Contains: `Dockerfile`, `devcontainer.json`
- Generated: No
- Committed: Yes

**`PrivilegedEAM/` (runtime output):**
- Purpose: Generated JSON output of EAM classification runs — written by `Save-EntraOpsPrivilegedEAMJson`
- Default path: `./PrivilegedEAM/` (configurable via `-ExportFolder`)
- Generated: Yes — recreated on every run
- Committed: Yes — this is the primary data store tracked in git and used for WatchList/Log Analytics ingestion

---

*Structure analysis: 2026-03-24*
