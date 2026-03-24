# EntraOps: How It Works & Implementation Guide

## What Is EntraOps?

EntraOps is a PowerShell DevOps tool for implementing Microsoft's **Enterprise Access Model (EAM)** in Entra ID. The core idea is simple: every identity in your tenant should be classified into a privilege tier, and then technical controls should enforce that classification automatically. The tool does the classification, the enforcement, the monitoring, and the ongoing drift detection — all as code.

---

## The Tiering Model

EntraOps uses three tiers, mapped from Microsoft's EAM:

| Tier | Name | Tag | What lives here |
|------|------|-----|----------------|
| 0 | **ControlPlane** | `0` | Full directory control — Global Admins, Conditional Access admins, auth policy owners, app registration owners, etc. |
| 1 | **ManagementPlane** | `1` | Operational management — Teams/M365 service admins, limited Intune, read-only app roles, etc. |
| 2 | **UserAccess** | `2` | Default user/guest permissions |

The tier definitions live as JSON in `Classification/Templates/`. There is one file per RBAC system:
- `Classification_AadResources.json` — Entra ID directory roles (the big one)
- `Classification_AppRoles.json` — Microsoft Graph API permissions
- `Classification_DeviceManagement.json` — Intune RBAC
- `Classification_Defender.json` — Defender XDR RBAC
- `Classification_IdentityGovernance.json` — Entitlement Management

You **do not need to write these files**. EntraOps ships with them, and can auto-update them from the upstream AzurePrivilegedIAM GitHub repo. You only edit them if you want to customize tier assignments for your organization.

---

## The Controls EntraOps Enforces

Once it knows who is at what tier, EntraOps implements three types of controls:

1. **Administrative Units (AUs)** — Places each privileged user/group/SP into a tier-specific AU (e.g., `Tier0-ControlPlane.EntraID`). Privileged access to these AUs can then be scoped to protect lateral movement.

2. **Restricted Management AUs (RMAUs)** — A special AU type where only specific roles can modify members. Used to protect Control Plane objects from being modified by lower-tier admins.

3. **Conditional Access Groups** — Security groups like `sug_Entra.CA.IncludeUsers.PrivilegedAccounts.ControlPlane.EntraID` that CA policies target. This lets you enforce MFA, compliant devices, etc., specifically for each tier.

---

## Implementation Workflow

### Step 1: Prerequisites

- PowerShell 7+
- `Az` and `Microsoft.Graph` PowerShell modules
- A private GitHub repo (fork this one)
- A Microsoft Entra tenant where you're a Global Administrator

### Step 2: Clone & Import

```powershell
git clone https://github.com/<your-org>/<your-entraops-fork>
cd <your-entraops-fork>
Import-Module ./EntraOps
```

### Step 3: Create Your Config File

```powershell
New-EntraOpsConfigFile `
  -TenantName "contoso.onmicrosoft.com" `
  -ApplyAutomatedClassificationUpdate $true `
  -ApplyAutomatedControlPlaneScopeUpdate $true `
  -IngestToLogAnalytics $true `
  -IngestToWatchLists $true `
  -ApplyConditionalAccessTargetGroups $true `
  -ApplyAdministrativeUnitAssignments $true `
  -ApplyRmauAssignmentsForUnprotectedObjects $true
```

This creates `EntraOpsConfig.json`. Review it — key settings include:
- Which RBAC systems to scan (`EntraID`, `IdentityGovernance`, `ResourceApps`, `DeviceManagement`, `Defender`)
- Log Analytics workspace details (if ingesting telemetry)
- Sentinel WatchList parameters
- Flags for which controls to apply automatically

### Step 4: Create a Workload Identity for CI/CD

This creates an Entra app registration with the permissions EntraOps needs, and sets up OIDC federation so GitHub Actions can authenticate without a secret:

```powershell
New-EntraOpsWorkloadIdentity `
  -AppDisplayName "EntraOps" `
  -CreateFederatedCredential `
  -GitHubOrg "YourOrg" `
  -GitHubRepo "YourRepoName" `
  -FederatedEntityType "Branch" `
  -FederatedEntityName "main"
```

Then populate the workflow YAML files with the app's identity:

```powershell
Update-EntraOpsRequiredWorkflowParameters
```

### Step 5: First Run — Discover and Classify

Connect and run the analysis:

```powershell
Connect-EntraOps -AuthenticationType "UserInteractive" -TenantName "contoso.onmicrosoft.com"

# Export classified data to JSON files (creates ./PrivilegedEAM/ folder)
Save-EntraOpsPrivilegedEAMJson -RbacSystems @("EntraID", "IdentityGovernance", "ResourceApps")
```

This queries Graph/Intune/Defender APIs, classifies every privileged identity, and writes JSON files. Commit these to your repo — this is the "access as code" baseline.

### Step 6: Implement Tier Controls

Create the Administrative Units:

```powershell
New-EntraOpsPrivilegedAdministrativeUnit `
  -ApplyToAccessTierLevel @("ControlPlane", "ManagementPlane") `
  -RbacSystems @("EntraID", "IdentityGovernance", "ResourceApps") `
  -RestrictedAuMode "Selected"
```

Populate them with the classified identities:

```powershell
Update-EntraOpsPrivilegedAdministrativeUnit `
  -ApplyToAccessTierLevel @("ControlPlane", "ManagementPlane") `
  -RbacSystems @("EntraID", "IdentityGovernance", "ResourceApps")
```

Catch any privileged identities that aren't already protected (not in a RAG, RMAU, or role-assignable group):

```powershell
New-EntraOpsPrivilegedUnprotectedAdministrativeUnit -ApplyToAccessTierLevel @("ControlPlane")
Update-EntraOpsPrivilegedUnprotectedAdministrativeUnit -ApplyToAccessTierLevel @("ControlPlane")
```

Create Conditional Access targeting groups:

```powershell
New-EntraOpsPrivilegedConditionalAccessGroup `
  -GroupPrefix "sug_Entra.CA.IncludeUsers.PrivilegedAccounts." `
  -RbacSystems @("EntraID", "IdentityGovernance")

Update-EntraOpsPrivilegedConditionalAccessGroup `
  -GroupPrefix "sug_Entra.CA.IncludeUsers.PrivilegedAccounts." `
  -RbacSystems @("EntraID", "IdentityGovernance")
```

### Step 7: Ingest to Sentinel (Optional but Recommended)

```powershell
# To Log Analytics custom table (PrivilegedEAM_CL)
Save-EntraOpsPrivilegedEAMInsightsCustomTable `
  -SubscriptionId "xxx" -ResourceGroupName "EntraOpsRG" `
  -WorkspaceName "MyWorkspace" `
  -DataCollectionEndpointUri "https://xxx.ingest.monitor.azure.com" `
  -DataCollectionRuleId "xxx"

# To Sentinel WatchLists
Save-EntraOpsPrivilegedEAMWatchLists `
  -SentinelSubscriptionId "xxx" `
  -SentinelResourceGroupName "EntraOpsRG" `
  -SentinelWorkspaceName "MySentinelWorkspace" `
  -WatchListTemplates "All"
```

Deploy the Sentinel parsers from `Parsers/` and workbooks from `Workbooks/` via ARM template deployment.

---

## Ongoing Automation (GitHub Actions)

Once the initial setup is done, two scheduled pipelines do all the work:

**Pull pipeline** (`Pull-EntraOpsPrivilegedEAM.yaml`) — runs on a schedule:
1. Authenticates via OIDC (no secrets)
2. Optionally updates classification templates from upstream GitHub
3. Optionally refreshes Control Plane scope from Azure Security Exposure Management
4. Runs classification across all RBAC systems
5. Commits updated JSON files to your repo (Git tracks all privilege changes)

**Push pipeline** (`Push-EntraOpsPrivilegedEAM.yaml`) — runs after Pull:
1. Uploads data to Log Analytics / Sentinel WatchLists
2. Reconciles AU memberships (adds/removes as roles change)
3. Reconciles CA group memberships
4. Auto-protects any newly discovered unprotected privileged objects

All behavior is controlled by flags in `EntraOpsConfig.json` — you can disable any step.

---

## Key Files

| Path | Purpose |
|------|---------|
| `EntraOpsConfig.json` | Your environment config (create with `New-EntraOpsConfigFile`) |
| `Classification/Templates/*.json` | Tiering taxonomy (can auto-update from upstream) |
| `Classification/Global.json` | Principals to exclude from classification |
| `.github/workflows/Pull-*.yaml` | Scheduled data collection pipeline |
| `.github/workflows/Push-*.yaml` | Enforcement and ingestion pipeline |
| `PrivilegedEAM/` | Output JSON files (committed to repo as "access as code") |
| `Parsers/` | KQL parsers to deploy to Sentinel |
| `Workbooks/` | Azure Monitor workbooks to deploy |

---

## Summary: The Mental Model

```
Classification Templates (JSON)
         ↓
  EntraOps queries all RBAC systems via Graph API
         ↓
  Every identity gets a tier label (0/1/2)
         ↓
  Output committed to Git (drift tracking)
         ↓
  Controls enforced: AUs, RMAUs, CA groups
         ↓
  Data ingested to Sentinel for hunting & alerting
         ↓
  GitHub Actions keeps it all in sync on schedule
```

The classification templates define the "rules" of what makes something Tier 0 vs. Tier 1. EntraOps applies those rules automatically, continuously, across your entire tenant.
