# Codebase Concerns

**Analysis Date:** 2026-03-24

---

## Tech Debt

**Undocumented External Dependency — `Invoke-GkSeMgGraphRequest`:**
- Issue: `Get-EntraOpsWorkloadIdentityInfo.ps1` and `Save-EntraOpsWorkloadIdentityInfo.ps1` call `Invoke-GkSeMgGraphRequest`, a function from an external module (likely the `Maester` framework) that is not bundled, declared as a dependency, or documented anywhere in the module.
- Files: `EntraOps/Public/ServicePrincipals/Get-EntraOpsWorkloadIdentityInfo.ps1` (lines 29–35, 125, 160, 174, 188), `EntraOps/Public/ServicePrincipals/Save-EntraOpsWorkloadIdentityInfo.ps1` (lines 55–61, 125)
- Impact: WorkloadIdentity functions silently fail with `CommandNotFoundException` if the caller's session doesn't have Maester imported. The module has no guard or error message.
- Fix approach: Replace all `Invoke-GkSeMgGraphRequest` calls with the module's own `Invoke-EntraOpsMsGraphQuery`, which provides identical HTTP wrapping plus caching and retry logic.

**`RequiredModules` Commented Out in Module Manifest:**
- Issue: The `RequiredModules` block in `EntraOps.psd1` is commented out. PowerShell will not automatically install or validate `Az.Accounts`, `Az.Resources`, `Az.ResourceGraph`, or `Microsoft.Graph.Authentication` at import time.
- Files: `EntraOps/EntraOps.psd1` (lines 54–73)
- Impact: Users who `Import-Module ./EntraOps` without calling `Install-EntraOpsAllRequiredModules` first encounter cryptic `CommandNotFoundException` errors at runtime rather than a clear missing-dependency message.
- Fix approach: Restore the `RequiredModules` block (remove the comment wrapper). Using `RequiredModules` with `ModuleVersion` ensures PowerShell validates versions on import.

**PowerShell Version Mismatch (Manifest vs. psm1):**
- Issue: `EntraOps.psd1` declares `PowerShellVersion = '7.1'`, but `EntraOps.psm1` enforces `$PSVersionTable.PSVersion.Major -lt 7` (i.e., 7.0+). This discrepancy means the manifest rejects PS 7.0 but the module actually supports it.
- Files: `EntraOps/EntraOps.psd1` (line 32), `EntraOps/EntraOps.psm1` (line 2)
- Impact: Users on PS 7.0 see an import failure from the manifest check before the psm1 can run.
- Fix approach: Align manifest to `'7.0'` or raise the psm1 guard to match `'7.1'` — choose one.

**Duplicate Get/Save Function Pairs:**
- Issue: `Get-EntraOpsWorkloadIdentityInfo.ps1` (265 lines) and `Save-EntraOpsWorkloadIdentityInfo.ps1` contain nearly identical Graph query logic copied between them. Each calls the same URIs, iterates the same parallel blocks, and produces the same output objects.
- Files: `EntraOps/Public/ServicePrincipals/Get-EntraOpsWorkloadIdentityInfo.ps1`, `EntraOps/Public/ServicePrincipals/Save-EntraOpsWorkloadIdentityInfo.ps1`
- Impact: Bug fixes or API changes must be applied twice. One copy has already drifted (different variable names for `$TransitiveRoleAssignments`).
- Fix approach: Have `Save-EntraOpsWorkloadIdentityInfo` call `Get-EntraOpsWorkloadIdentityInfo` internally and then persist the result, rather than duplicating the retrieval logic.

**SampleMode Advertised but Non-Functional in Multiple Functions:**
- Issue: The `-SampleMode` parameter is documented and accepted by `Get-EntraOpsPrivilegedEAMIdGov`, `Get-EntraOpsPrivilegedEAMDefender`, `Get-EntraOpsPrivilegedEAMIntune`, and `Get-EntraOpsPrivilegedEAMResourceApps`, but when `$true`, each function adds a `WarningMessages` entry saying "SampleMode currently not supported!" and returns empty or skips the data-fetch stage — making offline/test mode unusable.
- Files: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMIdGov.ps1` (line 84), `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMDefender.ps1` (line 68), `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMIntune.ps1`, `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMResourceApps.ps1` (line 65)
- Impact: Callers cannot test or demo these pipelines without live tenant connectivity.
- Fix approach: Either add sample JSON under `Samples/` for each RBAC system and wire up the `SampleMode` path, or remove the parameter and document the limitation.

**Global Variable Coupling Across Module:**
- Issue: `Connect-EntraOps` sets 8+ global PowerShell variables (`$Global:TenantIdContext`, `$Global:TenantNameContext`, `$Global:DefaultFolderClassification`, `$Global:DefaultFolderClassifiedEam`, `$Global:EntraOpsConfig`, `$Global:UseInvokeRestMethodOnly`, `$Global:XdrAvdHuntingAccess`, `$Global:EntraOpsBaseFolder`) that almost every other function consumes implicitly by name. Functions silently fail with `NullReferenceException` if called without `Connect-EntraOps`.
- Files: `EntraOps/Public/Core/Connect-EntraOps.ps1` (lines 106–297), consumers in virtually all `Public/` functions
- Impact: Functions cannot be unit-tested or called standalone without first calling `Connect-EntraOps`. State leaks across module reloads.
- Fix approach: Consolidate session state into the existing `$__EntraOpsSession` hashtable (already Script-scoped) and pass it as a parameter or read it via a getter function, replacing reliance on global scope.

**Hardcoded Workflow Placeholder Values:**
- Issue: All three GitHub workflow files (`Pull-EntraOpsPrivilegedEAM.yaml`, `Push-EntraOpsPrivilegedEAM.yaml`, `Update-EntraOps.yaml`) contain `cron: YourCronSchedule` as the schedule expression. YAML will parse this as an invalid cron and the scheduled trigger silently never fires.
- Files: `.github/workflows/Pull-EntraOpsPrivilegedEAM.yaml` (line 12), `.github/workflows/Push-EntraOpsPrivilegedEAM.yaml` (contextual), `.github/workflows/Update-EntraOps.yaml` (line 12)
- Impact: Users who deploy without replacing the placeholder will have no scheduled automation; errors only surface in GitHub Actions, not on local setup.
- Fix approach: Set a sensible default (e.g., `'0 2 * * *'`) with a comment indicating it should be customised, or add a `workflow_dispatch` notice in the README.

---

## Security Considerations

**Access Token Materialized as Plaintext in Header Hashtable:**
- Risk: `Push-EntraOpsLogsIngestionAPI.ps1` converts the Azure Monitor access token from `SecureString` to plaintext using `ConvertFrom-SecureString -AsPlainText` and stores it inline in a hashtable: `@{"Authorization" = "Bearer $($AccessToken | ConvertFrom-SecureString -AsPlainText)"}`. The plaintext bearer token is then held in the `$headers` variable for the rest of the function scope.
- Files: `EntraOps/Public/Core/Push-EntraOpsLogsIngestionAPI.ps1` (line 76)
- Current mitigation: Token has a short TTL (~1 hour). Variable is function-scoped.
- Recommendations: Pass the `SecureString` directly to `Invoke-RestMethod -Authentication Bearer -Token $AccessToken` (supported in PS 7+) to avoid ever materializing the token as a plain string.

**Unauthenticated HTTP Fetches from External GitHub Repositories:**
- Risk: Three functions make unauthenticated `Invoke-RestMethod`/`Invoke-WebRequest` calls to `raw.githubusercontent.com` at runtime to download classification JSON and KQL query files. If the upstream repository is compromised or the URL changes, malicious classification data or query strings could be injected into the analysis pipeline.
- Files: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMIdGov.ps1` (line 66), `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMResourceAppsFirstParty.ps1` (lines 47–48, 146), `EntraOps/Public/ServicePrincipals/Get-EntraOpsWorkloadIdentityInfo.ps1` (lines 56–60)
- Current mitigation: HTTPS only; content is parsed into objects so arbitrary code execution is unlikely.
- Recommendations: Pin to a specific commit SHA rather than `main`/`refs/heads/main`. Cache downloaded files locally and validate against a checksum. Consider vendoring the classification files into the repo, similar to how `Classification/Templates/` is already used.

**`git config --global` in CI Action Modifies System-Level Git Config:**
- Risk: The `Git-Push` composite action runs `git config --global user.email` and `git config --global user.name`, which modify the system-wide git configuration on the hosted runner. While ephemeral runners reset between jobs, the `--global` scope is broader than necessary.
- Files: `.github/actions/Git-Push/action.yml` (lines 11–12)
- Current mitigation: GitHub-hosted runners are ephemeral; the global config is discarded after the job.
- Recommendations: Replace `--global` with `--local` to restrict changes to the repository scope, following the principle of least privilege.

**`Update-EntraOps` Clones Public Repo Without Integrity Verification:**
- Risk: `Update-EntraOps.ps1` runs `git clone https://github.com/Cloud-Architekt/EntraOps.git` and then copies files into the working module directory. There is no hash or signature verification of the downloaded content before it overwrites live module files.
- Files: `EntraOps/Public/Core/Update-EntraOps.ps1` (lines 40–43)
- Current mitigation: Git transport uses HTTPS with TLS.
- Recommendations: Add a commit SHA or tag parameter, default to a pinned release tag rather than `main`, and optionally verify file checksums post-clone.

---

## Performance Bottlenecks

**Hardcoded Cache Key in `Invoke-EntraOpsParallelObjectResolution`:**
- Problem: The pre-fetch block in `Invoke-EntraOpsParallelObjectResolution.ps1` manually constructs cache keys in the format `"https://graph.microsoft.com/beta/directoryObjects/$($Obj.id)?$select=..."` and must exactly match the URL that `Get-EntraOpsPrivilegedEntraObject.ps1` will later pass to `Invoke-EntraOpsMsGraphQuery`. If either the `$select` properties list or the URL format drifts between files, every pre-fetch miss falls back to a per-object API call, eliminating the performance benefit.
- Files: `EntraOps/Private/Invoke-EntraOpsParallelObjectResolution.ps1` (lines 87–97), `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEntraObject.ps1` (line 80)
- Cause: The pre-fetch optimization was added after the fact and relies on string matching rather than a shared constant.
- Improvement path: Extract the select-properties string and URL pattern into a module-scoped constant (`$Script:ObjectSelectQuery`) shared by both files, so any change automatically stays in sync.

**Parallel Threads Re-initialize `__EntraOpsSession` Globally:**
- Problem: Both `Get-EntraOpsPrivilegedEAMEntraId.ps1` and `Invoke-EntraOpsParallelObjectResolution.ps1` set `$global:__EntraOpsSession` inside `ForEach-Object -Parallel` blocks. Because parallel runspaces inherit a copy of the session state, writes to `$global:` inside a thread do not propagate back to the parent and the initialization is wasted. On some PS 7 builds this also creates race conditions when multiple parallel jobs write to the same global simultaneously.
- Files: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMEntraId.ps1` (lines 639–660), `EntraOps/Private/Invoke-EntraOpsParallelObjectResolution.ps1` (lines 193–195)
- Cause: Parallel runspace isolation not accounted for in the session-state design.
- Improvement path: Use `$using:` to pass an immutable snapshot of the needed session data into threads rather than re-initializing global scope inside each thread.

**Large Monolithic Functions:**
- Problem: `Get-EntraOpsPrivilegedEntraIdRoles.ps1` (889 lines) and `Get-EntraOpsPrivilegedEAMEntraId.ps1` (852 lines) each contain 6 tightly coupled processing stages, classification logic, parallel dispatch, and output formatting in a single function body. Profiling any single stage requires running the entire pipeline.
- Files: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEntraIdRoles.ps1`, `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMEntraId.ps1`
- Cause: Iterative feature addition without extraction of sub-functions.
- Improvement path: Extract the 6 named stages into private helper functions (already scaffolded as `#region Stage N`) to allow independent testing and future parallelization.

---

## Fragile Areas

**`Save-EntraOpsEAMRbacSystemJson` — Destructive Folder Replacement:**
- Files: `EntraOps/Private/Save-EntraOpsEAMRbacSystemJson.ps1` (lines 55–67)
- Why fragile: The function deletes the entire export folder (`Remove-Item -Recurse -Force`) and then recreates it before writing new data. If the process is interrupted between the delete and the write, all existing EAM JSON output is permanently lost with no recovery path.
- Safe modification: Add an atomic swap pattern — write to a temp folder first, then rename it over the old one in a single filesystem operation.
- Test coverage: No tests cover the save/restore behavior.

**`Update-EntraOps` — Partial-Update Data Loss:**
- Files: `EntraOps/Public/Core/Update-EntraOps.ps1` (lines 46–62)
- Why fragile: The function deletes each `$TargetUpdateFolder` entry and then copies the replacement from the git clone. If the clone succeeds but a copy fails (disk full, permission error), the folder is gone and the module is unloadable.
- Safe modification: Validate the clone before deleting any target folders. Keep a backup of each folder and restore on failure.
- Test coverage: None.

**Implicit Dependency on `$EntraOpsConfig` Object Shape:**
- Files: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEntraObject.ps1` (lines 44–50), nearly all `Public/` functions
- Why fragile: Default parameter values like `$CustomSecurityUserAttribute = $EntraOpsConfig.CustomSecurityAttributes.PrivilegedUserAttribute` are evaluated at parse time. If `$EntraOpsConfig` is `$null` or has a different schema (e.g., after a config file change), default values silently become `$null` and downstream attribute lookups fail without a descriptive error.
- Safe modification: Add an explicit guard in `Connect-EntraOps` that validates required config keys exist and are non-empty before setting the global.

**Cache Expiry Race in `Invoke-EntraOpsMsGraphQuery`:**
- Files: `EntraOps/Public/Core/Invoke-EntraOpsMsGraphQuery.ps1` (lines 131–155)
- Why fragile: The function checks `$__EntraOpsSession.CacheMetadata.ContainsKey($cacheKey)` and then reads `$__EntraOpsSession.CacheMetadata[$cacheKey]` in separate operations. In parallel execution contexts, another thread could remove the key between the `ContainsKey` check and the property access, causing a `NullReferenceException`.
- Safe modification: Store the lookup result in a local variable: `$CacheEntry = $__EntraOpsSession.CacheMetadata[$cacheKey]; if ($null -ne $CacheEntry -and ...)`.

---

## Test Coverage Gaps

**Zero Pester Test Files:**
- What's not tested: The entire module — all 40+ public functions, 7 private functions, classification logic, caching, retry, parallel processing, and workflow generation.
- Files: None — Pester test infrastructure does not exist.
- Risk: Any change to classification logic (`Invoke-EntraOpsEAMClassificationAggregation`), cache behavior (`Invoke-EntraOpsMsGraphQuery`), or save logic (`Save-EntraOpsEAMRbacSystemJson`) can silently regress with no automated signal.
- Priority: **High** — Functions that handle privileged identity classification have no safety net.

**`SampleMode` Code Paths Untestable Without Live Tenant:**
- What's not tested: The full pipeline for IdGov, Defender, Intune, and ResourceApps RBAC systems cannot be exercised offline because SampleMode paths are stubs.
- Files: `EntraOps/Public/PrivilegedAccess/Get-EntraOpsPrivilegedEAMIdGov.ps1`, `Get-EntraOpsPrivilegedEAMDefender.ps1`, `Get-EntraOpsPrivilegedEAMIntune.ps1`, `Get-EntraOpsPrivilegedEAMResourceApps.ps1`
- Risk: Integration errors in these pipelines are only discovered during live runs against a tenant.
- Priority: **High** — Required for CI-based regression testing.

**No Tests for Security-Critical Classification Logic:**
- What's not tested: `Invoke-EntraOpsEAMClassificationAggregation.ps1` and `Resolve-EntraOpsClassificationPath.ps1` transform raw Graph API data into tier/classification labels that drive all downstream security decisions.
- Files: `EntraOps/Private/Invoke-EntraOpsEAMClassificationAggregation.ps1`, `EntraOps/Private/Resolve-EntraOpsClassificationPath.ps1`
- Risk: Misclassification of a Control Plane object as a lower tier could suppress security alerts or allow incorrect Administrative Unit assignments.
- Priority: **High** — Classification correctness is the primary security guarantee of the module.

**No Tests for Destructive Operations (`Save-*`, `Update-*`):**
- What's not tested: Folder cleanup in `Save-EntraOpsEAMRbacSystemJson`, file replacement in `Update-EntraOps`, Administrative Unit assignments in `Update-EntraOpsPrivilegedAdministrativeUnit`.
- Files: `EntraOps/Private/Save-EntraOpsEAMRbacSystemJson.ps1`, `EntraOps/Public/Core/Update-EntraOps.ps1`, `EntraOps/Public/PrivilegedAccess/Update-EntraOpsPrivilegedAdministrativeUnit.ps1`
- Risk: Regressions in save/update logic cause silent data loss or misconfigured tenant objects.
- Priority: **Medium** — Requires mocking of filesystem and Graph API calls.

---

## Missing Critical Features

**No Module-Level Input Validation for Config File:**
- Problem: `Connect-EntraOps` reads `$ConfigFilePath` and assigns config values to globals, but does not validate that required fields (`RbacSystems`, `CustomSecurityAttributes`, `LogAnalytics`) exist or are non-null before proceeding.
- Blocks: Functions that use `$EntraOpsConfig.*` as default parameter values will silently receive `$null` defaults if the config key is missing or misspelled, producing confusing downstream errors.

**No Rollback Mechanism for `Update-EntraOps`:**
- Problem: Once `Update-EntraOps` removes a target folder and the copy fails, there is no way to restore the previous state.
- Blocks: Safe automated updates via the `Update-EntraOps.yaml` workflow; currently any failed workflow run may require manual git checkout to restore the module.

---

*Concerns audit: 2026-03-24*
