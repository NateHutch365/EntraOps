---
status: resolved
trigger: "Classification fails with 'Authentication needed. Please call Connect-MgGraph' when run from the GUI after connecting via DeviceAuthentication"
created: 2026-03-26T00:00:00Z
updated: 2026-03-26T00:00:00Z
resolved: 2026-03-26T00:00:00Z
---

## Current Focus

hypothesis: buildPwshArgs() calls Connect-EntraOps -AlreadyAuthenticated WITHOUT passing token params (-AccountId, -AzArmAccessToken, -MsGraphAccessToken). In a fresh pwsh process there is no Az/MgGraph context, so the AlreadyAuthenticated branch falls through to error.
test: Restore token passing with fresh tokens extracted at classify-time (not stale connect-time tokens)
expecting: Graph API calls succeed because the classify process has a valid MgGraph session established via explicit token params
next_action: Implement fix in connect.ts (export refreshAuthTokens) and commands.ts (pass tokens to Connect-EntraOps)

## Symptoms

expected: After connecting via the GUI (DeviceAuthentication), running classification should succeed — the classify pwsh process should have a valid MgGraph session.
actual: Every Graph API call fails with "Authentication needed. Please call Connect-MgGraph" in the classify process.
errors: "Failed to execute https://graph.microsoft.com/beta/roleManagement/directory/roleEligibilitySchedules... (non-retryable error). Error: Authentication needed. Please call Connect-MgGraph."
reproduction: 1) Start GUI server. 2) Connect via DeviceAuthentication. 3) Run classification (Entra ID). 4) Fails immediately on Graph calls.
started: Has never worked reliably. Prior fix removed explicit token passing hoping persisted Az context carries over, but each pwsh spawn is isolated.

## Eliminated

- hypothesis: Persisted Az context (~/.Azure/) carries over MgGraph session to new pwsh processes
  evidence: Az context persists refresh tokens for Az, but MgGraph context is NOT persisted to disk. New pwsh process has no MgGraph session. Confirmed by reading AlreadyAuthenticated branch — when no tokens and no MgGraph context, it errors.
  timestamp: 2026-03-26

## Evidence

- timestamp: 2026-03-26
  checked: commands.ts buildPwshArgs() lines 68-78
  found: authInit calls Connect-EntraOps -AlreadyAuthenticated with only -TenantName and -NoWelcome — no -AccountId, -AzArmAccessToken, -MsGraphAccessToken
  implication: AlreadyAuthenticated branch checks for those params first; without them, falls to elseif checking Get-AzContext/Get-MgContext which are both null in a fresh process

- timestamp: 2026-03-26
  checked: Connect-EntraOps.ps1 AlreadyAuthenticated branch lines 214-243
  found: First branch requires $AccountId -and $MsGraphAccessToken -and $AzArmAccessToken. Second branch requires existing Az+Mg context. Third requires just Az context. All fail in fresh process without tokens.
  implication: Tokens MUST be passed explicitly for fresh pwsh processes

- timestamp: 2026-03-26
  checked: connect.ts extractTokens() lines 50-78
  found: extractTokens() spawns a fresh pwsh that CAN successfully get tokens via Get-AzAccessToken (because Az persists refresh tokens to ~/.Azure/). But it only runs once at connect-time, and tokens have 60-90min lifetime.
  implication: Need to re-extract tokens at classify-time so they're always fresh (seconds old)

## Resolution

root_cause: buildPwshArgs() removed explicit token params (-AccountId, -AzArmAccessToken, -MsGraphAccessToken) from the Connect-EntraOps call. Without these, a fresh pwsh process has no MgGraph session. Tokens must be passed explicitly AND refreshed at classify-time to avoid expiry.
fix: 1) Add refreshAuthTokens() export to connect.ts that re-extracts fresh tokens from persisted Az context. 2) In commands.ts buildPwshArgs(), call refreshAuthTokens() and pass -AccountId, -AzArmAccessToken, -MsGraphAccessToken to Connect-EntraOps.
verification: 
files_changed: [gui/server/services/connect.ts, gui/server/services/commands.ts]
