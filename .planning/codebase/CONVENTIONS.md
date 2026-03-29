# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- One function per file, file name matches function name exactly
- Pattern: `Verb-EntraOpsNoun.ps1` (e.g., `Get-EntraOpsPrivilegedEAM.ps1`, `Invoke-EntraOpsMsGraphQuery.ps1`)
- All files use PowerShell approved verbs: Get, Set, New, Save, Export, Update, Invoke, Push, Connect, Disconnect, Install, Clear, Expand, Import, Resolve, Show
- Private helpers follow same convention: `New-EntraOpsEAMOutputObject.ps1`, `Invoke-EntraOpsParallelObjectResolution.ps1`

**Functions:**
- Always prefixed with `EntraOps` after the verb: `Verb-EntraOps[Domain][Noun]`
- Domain segments used: `Privileged`, `EAM`, `Classification`, `Workload`, `Managed`, `Ops`
- Private functions omit public-facing concerns but keep the prefix: `Invoke-EntraOpsEAMClassificationAggregation`, `Resolve-EntraOpsClassificationPath`

**Variables:**
- PascalCase throughout — no camelCase or snake_case: `$TenantId`, `$RbacSystems`, `$UniqueObjects`, `$HeaderParams`
- Module session state stored in `$__EntraOpsSession` (double-underscore prefix, script-scope hashtable)
- Global module variables: `$EntraOpsBaseFolder`, `$DefaultFolderClassification`, `$TenantNameContext` (PascalCase, set via `New-Variable -Scope Global`)
- Loop iteration variables: PascalCase matching context — `$TypeGroup`, `$MessageGroup`, `$Obj`, `$Assignment`
- Temporary counters/flags: lowercase camel — `$isBatch`, `$isMethodGet`, `$isCacheablePost` (exception: boolean flags inside logic blocks)

**Parameters:**
- PascalCase, typed explicitly: `[System.String]$TenantId`, `[Array]$RbacSystems`, `[System.Boolean]$SampleMode`
- System namespace types preferred over aliases: `[System.String]` not `[string]`, `[System.Boolean]` not `[bool]` (in older functions; newer functions use `[bool]`, `[string]`, `[int]` shorthand — both exist)
- Switch parameters use `[switch]` type: `[switch]$IncludeActivatedPIMAssignments`, `[switch]$DisableCache`

**Properties (Output Objects):**
- PascalCase with quoted keys in `@{}` hashtable literals: `'ObjectId'`, `'ObjectType'`, `'RoleSystem'`
- Schema property names are consistent across all EAM cmdlets — defined in `EntraOps/Private/New-EntraOpsEAMOutputObject.ps1`

## Code Style

**Formatting:**
- No `.editorconfig`, PSScriptAnalyzer settings file, or formatter config detected
- 4-space indentation throughout
- Opening brace on same line as control statement or function header
- Closing brace on its own line
- No trailing whitespace convention enforced by tooling

**Comment-Based Help:**
- Every public function has a `<# .SYNOPSIS / .DESCRIPTION / .PARAMETER / .EXAMPLE #>` block
- Help block placed **before** the `function` keyword for private functions (e.g., `Resolve-EntraOpsClassificationPath.ps1`)
- Help block placed **inside** the `function` block for private helpers written inline style (e.g., `New-EntraOpsEAMOutputObject.ps1`, `Show-EntraOpsWarningSummary.ps1`)
- At least 2 `.EXAMPLE` entries per public cmdlet showing distinct use cases

**Regions:**
- `#region` / `#endregion` used heavily in large functions to demarcate logical stages
- Stage labels used in long EAM functions: `#region Stage 1: Fetch ...`, `#endregion`
- Config/setup sections also use regions: `#region Connect to Azure Resource Manager`, `#region Create configuration file schema`

**CmdletBinding:**
- `[CmdletBinding()]` (PascalCase) on all public functions — provides `-Verbose`, `-Debug`, `-ErrorAction` support
- `[cmdletbinding()]` (lowercase) on a small number of older functions (`Connect-EntraOps.ps1`, `Get-EntraOpsPrivilegedEamEntraId.ps1`) — normalize to PascalCase in new code
- `Process {}` block used in `Connect-EntraOps` only; other functions use bare body — use bare body in new functions unless pipeline input is needed

## Import Organization

**Order (within .psm1):**
1. Runtime prerequisites check (`$PSVersionTable`)
2. Environment variable checks (`$env:ENTRAOPS_NOWELCOME`)
3. Dot-source all Public `.ps1` files via `Get-ChildItem -Recurse`
4. Dot-source all Private `.ps1` files
5. Module-level variable initialization (`$__EntraOpsSession`, `$EntraOpsBaseFolder`)
6. `Export-ModuleMember -Function $Public.Basename`

**Within functions — no import ordering convention.** Dependencies on other EntraOps functions are implicit via dot-sourced module loading.

**Path Aliases:**
- No `#requires` module statements in individual function files
- Module manifest (`EntraOps.psd1`) handles dependency declarations (commented out; installed dynamically via `Install-EntraOpsRequiredModule`)

## Parameter Declaration Style

```powershell
# Standard multi-parameter pattern — comma BEFORE next parameter on its own line
function Example-EntraOpsCmdlet {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $false)]
        [ValidateSet("EntraID", "IdentityGovernance", "DeviceManagement", "ResourceApps", "Defender")]
        [Array]$RbacSystems = ("EntraID", "IdentityGovernance", "DeviceManagement", "ResourceApps", "Defender")
        ,
        [Parameter(Mandatory = $false)]
        [System.Boolean]$SampleMode = $False
        ,
        [Parameter(Mandatory = $false)]
        [switch]$IncludeActivatedPIMAssignments
    )
    ...
}
```

Key points:
- Comma `,` starts the new line before each subsequent parameter (not at end of previous line)
- `Mandatory = $false` explicit on all optional params
- Boolean defaults: `$False` (capital F) in older code, `$false` (lowercase) in newer — use `$false` in new code
- Default values set inside `param()` block, never at top of function body

## Validation Patterns

```powershell
# Enum-like string validation
[ValidateSet("EntraID", "IdentityGovernance", "DeviceManagement", "ResourceApps", "Defender")]
[Array]$RbacSystems

# GUID validation
[ValidatePattern('^([0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})$')]
[System.String]$AadObjectId

# Tenant name format validation
[ValidatePattern('^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$')]
[System.String]$TenantName

# Path existence validation
[ValidateScript({ Test-Path $_ })]
[System.String]$ConfigFilePath

# Output type enum
[ValidateSet("HashTable", "PSObject", "HttpResponseMessage", "Json")]
[string]$OutputType = "HashTable"
```

See examples in: `EntraOps/Public/Core/Invoke-EntraOpsMsGraphQuery.ps1`, `EntraOps/Public/Core/Connect-EntraOps.ps1`, `EntraOps/Public/Core/Get-EntraOpsEntraObject.ps1`

## Error Handling

**Strategy:** `$ErrorActionPreference = "Stop"` set at module load (`EntraOps.psm1`) and re-set explicitly at the top of critical `Process {}` blocks (`Connect-EntraOps.ps1`, `Push-EntraOpsLogsIngestionAPI.ps1`)

**Patterns:**

```powershell
# Fatal operation — re-throw or Write-Error terminates execution
try {
    $Result = Invoke-EntraOpsMsGraphQuery -Uri $Uri
} catch {
    Write-Error "Failed to fetch data from $Uri. Error: $_"
}

# Not-found differentiation — classify before deciding to fail or skip
try {
    $ObjectDetails = Get-SomeObject -Id $Id
} catch {
    if ($_.Exception.Message -match "ResourceNotFound" -or $_.Exception.Message -match "404") {
        Write-Verbose "Object $Id not found (404) — skipping"
        $ObjectDetails = $null
    } else {
        throw $_  # Re-throw unexpected errors
    }
}

# Guaranteed cleanup via finally
try {
    $Sha256 = [System.Security.Cryptography.SHA256]::Create()
    $Hash = $Sha256.ComputeHash($Bytes)
} finally {
    $Sha256.Dispose()
}

# Session state restoration — always in finally
try {
    $__EntraOpsSession.DefaultCacheTTL = $EffectiveDefaultTTL
    # ... do work ...
} finally {
    $__EntraOpsSession.DefaultCacheTTL = $OriginalDefaultTTL
    $__EntraOpsSession.StaticDataCacheTTL = $OriginalStaticTTL
}
```

See patterns in: `EntraOps/Public/Core/Invoke-EntraOpsMsGraphQuery.ps1`, `EntraOps/Public/Core/Get-EntraOpsEntraObject.ps1`, `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAM.ps1`

**Warning collection pattern** — used by all EAM cmdlets:
```powershell
$WarningMessages = New-Object -TypeName "System.Collections.Generic.List[psobject]"
# ... throughout function:
$WarningMessages.Add([PSCustomObject]@{Type = "Stage1"; Message = "SampleMode not supported!"})
# ... at end:
Show-EntraOpsWarningSummary -WarningMessages $WarningMessages
```

## Logging and Output

**Write-Host** (user-visible, colored banners):
```powershell
Write-Host "════════════════════════════════...═" -ForegroundColor Cyan
Write-Host "  Stage 1/6: Fetching Role Assignments"  -ForegroundColor Cyan
Write-Host "  ℹ️  Cache will be restored after completion" -ForegroundColor Gray
Write-Host "  ⚠ Warnings Summary" -ForegroundColor Yellow
```
- Unicode box-drawing characters (`═`) used for section banners
- Emoji in informational messages (⏱️, ℹ️, ⚠)
- `-ForegroundColor Cyan` for stage headers, `Yellow` for warnings, `Gray` for info, `DarkYellow` for detail

**Write-Verbose** — diagnostic/trace info not needed in normal operation:
```powershell
Write-Verbose "Importing $($Import.FullName)"
Write-Verbose "Using tenant-specific classification file: $TenantSpecificPath"
Write-Verbose "Object $AadObjectId not found (404 Not Found)"
```

**Write-Warning** — non-fatal issues that don't stop execution:
```powershell
Write-Warning "Failed to create persistent cache directory: $_"
Write-Warning "Global exclusion file not found at $GlobalJsonPath"
```

**Write-Error** — fatal errors (terminates per `$ErrorActionPreference = "Stop"`):
```powershell
Write-Error "Classification file $FileName not found in $FolderClassification."
Write-Error "Invalid Graph URI: $($Uri)!"
```

**Write-Progress** — long-running multi-stage operations:
```powershell
Write-Progress -Activity "Stage 4/6: Pre-Fetching Principal Details" `
    -Status "Batch $BatchNumber of $TotalBatches ($($Batch.Count) objects)..." `
    -PercentComplete (($TypeIndex / $TotalTypes) * 100)
# Always paired with -Completed at end:
Write-Progress -Activity "Stage 4/6: Pre-Fetching Principal Details" -Completed
```

## Output Object Construction

**Standard EAM output** — always via `New-EntraOpsEAMOutputObject` private helper (`EntraOps/Private/New-EntraOpsEAMOutputObject.ps1`):
```powershell
New-EntraOpsEAMOutputObject `
    -ObjectId $ObjectId `
    -ObjectDetails $ObjectDetails `
    -Classification $Classification `
    -RoleAssignments $RoleAssignments `
    -RoleSystem "EntraID"
```

**Ad-hoc PSCustomObject** when not using the helper:
```powershell
[PSCustomObject]@{
    'ObjectId'    = $ObjectId
    'ObjectType'  = ($ObjectDetails.ObjectType ?? 'unknown').ToLower()
    'RoleSystem'  = $RoleSystem
    'Classification' = $Classification
    'RoleAssignments' = @($RoleAssignments | Sort-Object ...)
}
```
- Always use single-quoted property names in `@{}` literals
- Null-coalescing operator `??` used for safe defaults: `$Value ?? 'default'`
- `.ToLower()` applied to type strings for consistency

## Parallel Processing

```powershell
# Thread-safe shared state
$SyncCache = [System.Collections.Hashtable]::Synchronized($ObjectDetailsCache)

# Parallel execution (PS7+ only — guaranteed by module prerequisite)
$Results = $UniqueObjects | ForEach-Object -ThrottleLimit $ParallelThrottleLimit -Parallel {
    $obj = $_
    $SharedCache = $using:SyncCache  # $using: prefix for captured variables
    
    # Module functions CANNOT be called from parallel runspaces — inline the logic
    [PSCustomObject]@{ ... }
}
```

Key rules:
- Always check `$UniqueObjects.Count -ge 50` before enabling parallel (threshold: 50 objects)
- Pass module session via `$using:` variable — never assume `$__EntraOpsSession` is accessible
- For classification aggregation use `Invoke-EntraOpsEAMClassificationAggregation` helper (`EntraOps/Private/Invoke-EntraOpsEAMClassificationAggregation.ps1`)

## Collections

```powershell
# Mutable list for warning accumulation
$WarningMessages = New-Object -TypeName "System.Collections.Generic.List[psobject]"

# Array literal
$RbacSystems = @("EntraID", "IdentityGovernance")

# Hashtable for fast lookup  
$ObjectDetailsCache = @{}

# Group-Object for hash-keyed grouping
$RbacByObject = $ClassifiedAssignments | Group-Object ObjectId -AsHashTable
```

## Module-Level Variables

Set in `EntraOps/EntraOps.psm1` and available in all functions:

| Variable | Scope | Purpose |
|---|---|---|
| `$__EntraOpsSession` | Script | Runtime cache and session state hashtable |
| `$EntraOpsBaseFolder` | Global | Path to repo root folder |
| `$DefaultFolderClassification` | Set in `Connect-EntraOps` | Path to Classification/ |
| `$TenantNameContext` | Set in `Connect-EntraOps` | Current tenant name (for tenant-specific paths) |

Access session state via `$__EntraOpsSession.GraphCache`, `$__EntraOpsSession.DefaultCacheTTL`, etc.

---

*Convention analysis: 2026-03-24*
