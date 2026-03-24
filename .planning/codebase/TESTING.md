# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runner:**
- No Pester test suite detected. No `.Tests.ps1`, `*.Spec.ps1`, or `pester.ps1` files exist in the repository.
- No `Tests/` or `test/` directory exists.
- No Pester configuration file (`PesterConfiguration.psd1` or similar).

**Assertion Library:**
- None (Pester not installed/configured)

**Run Commands:**
```powershell
# No automated test commands available.
# See "Testing Approach" section for how to manually validate the module.
```

## Testing Approach

EntraOps uses **two complementary strategies** instead of traditional unit tests:

### 1. SampleMode — Offline Integration Testing

Several EAM cmdlets accept a `-SampleMode $true` parameter that loads pre-saved JSON files from `Samples/` instead of calling live Graph APIs. This enables testing classification logic and data transformation without a live Entra ID tenant.

**Supported cmdlets:**
- `Get-EntraOpsPrivilegedEamEntraId` (`EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMEntraId.ps1`) — loads from `Samples/AadRoleManagementAssignments.json` and `Samples/AadRoleManagementRoleDefinitions.json`
- `Get-EntraOpsPrivilegedEAMDefender` — SampleMode parameter present but marked unsupported (warns at runtime)
- `Get-EntraOpsPrivilegedEAMIntune` — SampleMode parameter present but marked unsupported

**Example usage:**
```powershell
# Run EntraID classification against sample data — no API calls made
$Result = Get-EntraOpsPrivilegedEamEntraId -SampleMode $true
$Result | Where-Object ObjectType -eq 'user' | Select-Object ObjectDisplayName, Classification

# Verify output schema
$Result[0].PSObject.Properties.Name  # Should match the 22-property EAM schema
```

**Available sample files** in `Samples/`:
- `AzBillingRoleAssignments.json` — Azure Billing RBAC sample data

**Gaps:** Most sample files referenced in code (`AadRoleManagementAssignments.json`, `AadRoleManagementRoleDefinitions.json`) are not committed. Extend the `Samples/` folder to add them for offline testing.

### 2. GitHub Copilot Agents — AI-Assisted QA

Two agent definition files provide structured analysis workflows as a quality verification layer:

| Agent | File | Purpose |
|---|---|---|
| QA Analyst | `.github/agents/entraops.qa.agent.md` | Point-in-time analysis of a single identity or role from exported JSON |
| Report Generator | `.github/agents/entraops.report.agent.md` | Full tenant-wide EAM compliance report from `PrivilegedEAM/` JSON output |

These agents are invoked via VS Code GitHub Copilot and consume the exported `PrivilegedEAM/*.json` files — they are not automated CI checks.

### 3. Parameter Validation as Input Guard

Runtime validation via PowerShell's parameter validation attributes acts as a first line of defense:

```powershell
# Enum validation — rejects invalid RBAC system names at bind time
[ValidateSet("EntraID", "IdentityGovernance", "DeviceManagement", "ResourceApps", "Defender")]
[Array]$RbacSystems

# GUID format validation — prevents malformed IDs from reaching Graph API
[ValidatePattern('^([0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})$')]
[System.String]$AadObjectId

# Path validation — fails fast if file doesn't exist
[ValidateScript({ Test-Path $_ })]
[System.String]$ConfigFilePath
```

See: `EntraOps/Public/Core/Connect-EntraOps.ps1`, `EntraOps/Public/Core/Get-EntraOpsEntraObject.ps1`, `EntraOps/Public/Core/Invoke-EntraOpsMsGraphQuery.ps1`

## Live Tenant Testing (Integration)

The primary testing workflow is execution against an actual Entra ID tenant via GitHub Actions or direct PowerShell:

```powershell
# Manual integration test sequence
Import-Module ./EntraOps
Connect-EntraOps -AuthenticationType UserInteractive -TenantName "yourtenant.onmicrosoft.com"

# Test EAM data collection
$EamData = Get-EntraOpsPrivilegedEAM -RbacSystems @("EntraID")

# Validate output schema
$EamData | ForEach-Object {
    if ($null -eq $_.ObjectId)   { Write-Warning "Missing ObjectId" }
    if ($null -eq $_.ObjectType) { Write-Warning "Missing ObjectType" }
    if ($null -eq $_.Classification) { Write-Warning "Missing Classification" }
}

# Test export pipeline
Save-EntraOpsPrivilegedEAMJson -RbacSystems @("EntraID") -ExportFolder ./TestOutput
Get-ChildItem ./TestOutput/*.json | ForEach-Object {
    $Content = Get-Content $_ | ConvertFrom-Json -Depth 20
    Write-Host "$($_.Name): $($Content.Count) objects"
}

Disconnect-EntraOps
```

## GitHub Actions CI Workflows

CI workflows (`.github/workflows/`) run the module against a live tenant but contain **no explicit test/validation step**:

| Workflow | File | Purpose |
|---|---|---|
| Pull | `.github/workflows/Pull-EntraOpsPrivilegedEAM.yaml` | Collect EAM data and commit JSON to repo |
| Push | `.github/workflows/Push-EntraOpsPrivilegedEAM.yaml` | Push EAM data to Sentinel/WatchLists |
| Update | `.github/workflows/Update-EntraOps.yaml` | Update module from upstream |

All workflows use `azure/powershell@v2` action with OIDC authentication (`FederatedCredentials`). No `Invoke-Pester` or test assertion step is present. Failures are detected only via PowerShell exceptions propagating to workflow failure.

## Warning Collection Pattern

EAM cmdlets collect non-fatal issues during execution and display them as a summary at the end. This acts as a soft validation layer:

```powershell
# Initialization (at top of EAM function)
$WarningMessages = New-Object -TypeName "System.Collections.Generic.List[psobject]"

# Accumulate warnings throughout processing
$WarningMessages.Add([PSCustomObject]@{
    Type    = "Stage1"
    Message = "SampleMode currently not supported for Defender!"
})

$WarningMessages.Add([PSCustomObject]@{
    Type    = "ObjectResolution"
    Message = "Failed to resolve ObjectId $ObjectId - excluded from results"
})

# Display at end of function
Show-EntraOpsWarningSummary -WarningMessages $WarningMessages
```

See implementation in: `EntraOps/Private/Show-EntraOpsWarningSummary.ps1`

## Output Schema Contract

The 22-property EAM output object is the implicit contract validated by all consumers. When adding or modifying EAM cmdlets, ensure output matches this schema from `EntraOps/Private/New-EntraOpsEAMOutputObject.ps1`:

```powershell
[PSCustomObject]@{
    'ObjectId'                      = [string]   # GUID
    'ObjectType'                    = [string]   # 'user' | 'group' | 'servicePrincipal' | 'unknown'
    'ObjectSubType'                 = [string]   # 'Member' | 'Guest' | 'Role-assignable' | 'Security' | SP type
    'ObjectDisplayName'             = [string]
    'ObjectUserPrincipalName'       = [string]   # UPN for users, null for others
    'ObjectAdminTierLevel'          = [string]   # Control | Management | Workload | Unclassified
    'ObjectAdminTierLevelName'      = [string]
    'OnPremSynchronized'            = [bool]
    'AssignedAdministrativeUnits'   = [array]
    'RestrictedManagementByRAG'     = [bool]
    'RestrictedManagementByAadRole' = [bool]
    'RestrictedManagementByRMAU'    = [bool]
    'RoleSystem'                    = [string]   # 'EntraID' | 'Defender' | 'DeviceManagement' | etc.
    'Classification'                = [array]    # Array of classification objects
    'RoleAssignments'               = [array]    # Sorted by AdminTierLevel, RoleDefinitionName
    'Sponsors'                      = [array]
    'Owners'                        = [array]
    'OwnedObjects'                  = [array]
    'OwnedDevices'                  = [array]
    'IdentityParent'                = [object]
    'AssociatedWorkAccount'         = [object]
    'AssociatedPawDevice'           = [object]
}
```

**Unclassified fallback** — when no classification matches, explicitly set:
```powershell
$Classification = @([PSCustomObject]@{
    'AdminTierLevel'     = "Unclassified"
    'AdminTierLevelName' = "Unclassified"
    'Service'            = "Unclassified"
})
```

## Validation Checklist (Manual)

When making changes to EAM cmdlets, verify:

- [ ] `SampleMode $true` still runs without errors on `Get-EntraOpsPrivilegedEamEntraId`
- [ ] Output schema matches 22-property contract (count via `($Result[0].PSObject.Properties).Count`)
- [ ] `ObjectType` is always lowercase (`user`, `group`, `servicePrincipal`)
- [ ] `Classification` array is never empty (falls back to `Unclassified`)
- [ ] Warning count displayed at end is reasonable (run `Show-EntraOpsWarningSummary`)
- [ ] Cache TTL values restored after function completes (`$__EntraOpsSession.DefaultCacheTTL`)
- [ ] `$ErrorActionPreference = "Stop"` propagates exceptions to caller correctly
- [ ] Parallel processing path and sequential path produce identical output schemas

## Adding Tests (Recommended Path)

No Pester infrastructure exists. To introduce automated testing:

1. Install Pester 5: `Install-Module Pester -MinimumVersion 5.0 -Force`
2. Create `Tests/` directory at repo root
3. Name test files `*.Tests.ps1` (e.g., `Tests/New-EntraOpsEAMOutputObject.Tests.ps1`)
4. Use the Module's SampleMode and static JSON fixtures from `Samples/` for unit tests
5. Mock `Invoke-EntraOpsMsGraphQuery` to test classification logic without live API calls

**Minimal Pester test structure for this module:**
```powershell
BeforeAll {
    Import-Module "$PSScriptRoot/../EntraOps" -Force
}

Describe "New-EntraOpsEAMOutputObject" {
    Context "Given valid parameters" {
        BeforeAll {
            $ObjectDetails = [PSCustomObject]@{
                ObjectType    = "User"; ObjectSubType = "Member"
                ObjectDisplayName = "Test User"; ObjectSignInName = "test@contoso.com"
                AdminTierLevel = "Unclassified"; AdminTierLevelName = "Unclassified"
                OnPremSynchronized = $false
                AssignedAdministrativeUnits = @(); Sponsors = @(); Owners = @()
                OwnedObjects = @(); OwnedDevices = @(); IdentityParent = $null
                AssociatedWorkAccount = $null; AssociatedPawDevice = $null
                RestrictedManagementByRAG = $false; RestrictedManagementByAadRole = $false
                RestrictedManagementByRMAU = $false
            }
            $script:Result = New-EntraOpsEAMOutputObject `
                -ObjectId "00000000-0000-0000-0000-000000000001" `
                -ObjectDetails $ObjectDetails `
                -Classification @([PSCustomObject]@{AdminTierLevel="Unclassified"; AdminTierLevelName="Unclassified"; Service="Unclassified"}) `
                -RoleAssignments @() `
                -RoleSystem "EntraID"
        }

        It "returns a PSCustomObject with 22 properties" {
            ($script:Result.PSObject.Properties).Count | Should -Be 22
        }

        It "ObjectType is lowercase" {
            $script:Result.ObjectType | Should -Be "user"
        }
    }
}
```

---

*Testing analysis: 2026-03-24*
