import { useState } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { Lock, Pencil } from 'lucide-react';
import type { EntraOpsConfig, RbacSystem } from '../../../../shared/types/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DiffDialog } from '@/components/templates/DiffDialog';
import { SaveBanner } from '@/components/templates/SaveBanner';
import { CronPicker } from '@/components/settings/CronPicker';
import { cn } from '@/lib/utils';

interface ConfigFormProps {
  diskConfig: EntraOpsConfig;
  draft: EntraOpsConfig | null;
  isEditing: boolean;
  isDirty: boolean;
  savedAt: number;
  onEditStart: () => void;
  onCancel: () => void;
  onDraftChange: (config: EntraOpsConfig) => void;
  onSave: () => Promise<void>;
}

// Client-side validation schema — mirrors server schema + cron format check
const cronString = z
  .string()
  .refine((v) => v.trim().split(/\s+/).length === 5, 'Must be a valid 5-field cron expression');

const configDraftSchema = z.object({
  TenantId: z.string(),
  TenantName: z.string(),
  AuthenticationType: z.enum([
    'UserInteractive',
    'SystemAssignedMSI',
    'UserAssignedMSI',
    'FederatedCredentials',
    'AlreadyAuthenticated',
    'DeviceAuthentication',
  ]),
  ClientId: z.string(),
  DevOpsPlatform: z.enum(['AzureDevOps', 'GitHub', 'None']),
  RbacSystems: z.array(
    z.enum(['Azure', 'AzureBilling', 'EntraID', 'IdentityGovernance', 'DeviceManagement', 'ResourceApps', 'Defender'])
  ),
  WorkflowTrigger: z.object({
    PullScheduledTrigger: z.boolean(),
    PullScheduledCron: cronString,
    PushAfterPullWorkflowTrigger: z.boolean(),
  }),
  AutomatedControlPlaneScopeUpdate: z.object({
    ApplyAutomatedControlPlaneScopeUpdate: z.boolean(),
    PrivilegedObjectClassificationSource: z.array(z.string()),
    EntraOpsScopes: z.array(z.string()),
    AzureHighPrivilegedRoles: z.array(z.string()),
    AzureHighPrivilegedScopes: z.array(z.string()),
    ExposureCriticalityLevel: z.string(),
  }),
  AutomatedClassificationUpdate: z.object({
    ApplyAutomatedClassificationUpdate: z.boolean(),
    Classifications: z.array(z.string()),
  }),
  AutomatedEntraOpsUpdate: z.object({
    ApplyAutomatedEntraOpsUpdate: z.boolean(),
    UpdateScheduledTrigger: z.boolean(),
    UpdateScheduledCron: cronString,
  }),
  LogAnalytics: z.object({
    IngestToLogAnalytics: z.boolean(),
    DataCollectionRuleName: z.string(),
    DataCollectionRuleSubscriptionId: z.string(),
    DataCollectionResourceGroupName: z.string(),
    TableName: z.string(),
  }),
  SentinelWatchLists: z.object({
    IngestToWatchLists: z.boolean(),
    WatchListTemplates: z.array(z.string()),
    WatchListWorkloadIdentity: z.array(z.string()),
    SentinelWorkspaceName: z.string(),
    SentinelSubscriptionId: z.string(),
    SentinelResourceGroupName: z.string(),
    WatchListPrefix: z.string(),
  }),
  AutomatedAdministrativeUnitManagement: z.object({
    ApplyAdministrativeUnitAssignments: z.boolean(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    RbacSystems: z.array(z.string()),
    RestrictedAuMode: z.string(),
  }),
  AutomatedConditionalAccessTargetGroups: z.object({
    ApplyConditionalAccessTargetGroups: z.boolean(),
    AdminUnitName: z.string(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    GroupPrefix: z.string(),
    RbacSystems: z.array(z.string()),
  }),
  AutomatedRmauAssignmentsForUnprotectedObjects: z.object({
    ApplyRmauAssignmentsForUnprotectedObjects: z.boolean(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    RbacSystems: z.array(z.string()),
  }),
  CustomSecurityAttributes: z.object({
    PrivilegedUserAttribute: z.string(),
    PrivilegedUserPawAttribute: z.string(),
    PrivilegedServicePrincipalAttribute: z.string(),
    UserWorkAccountAttribute: z.string(),
  }),
});

// Shared style for native select elements
const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const RBAC_SYSTEMS: RbacSystem[] = [
  'Azure',
  'AzureBilling',
  'EntraID',
  'IdentityGovernance',
  'DeviceManagement',
  'ResourceApps',
  'Defender',
];
const AUTH_TYPES = [
  'UserInteractive',
  'SystemAssignedMSI',
  'UserAssignedMSI',
  'FederatedCredentials',
  'AlreadyAuthenticated',
  'DeviceAuthentication',
] as const;
const DEVOPS_PLATFORMS = ['AzureDevOps', 'GitHub', 'None'] as const;

// Local helper components
function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-start gap-4 py-2 border-b border-border/40 last:border-0">
      <Label className="pt-2 text-sm text-muted-foreground">{label}</Label>
      <div className="pt-1">{children}</div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-start gap-4 py-2 border-b border-border/40">
      <div className="flex items-center gap-1.5 pt-1">
        <span title="Read-only — set by New-EntraOpsConfigFile">
          <Lock size={12} className="text-muted-foreground shrink-0" aria-label="Read-only" />
        </span>
        <Label className="text-sm text-muted-foreground">{label}</Label>
      </div>
      <p className="text-sm text-muted-foreground pt-1">{value || '—'}</p>
    </div>
  );
}

function ArrayInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Input
      value={value.join(', ')}
      onChange={(e) =>
        onChange(
          e.target.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        )
      }
      disabled={disabled}
      placeholder={placeholder ?? 'Comma-separated values'}
    />
  );
}

export function ConfigForm({
  diskConfig,
  draft,
  isEditing,
  isDirty,
  savedAt,
  onEditStart,
  onCancel,
  onDraftChange,
  onSave,
}: ConfigFormProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const configValues = isEditing && draft ? draft : diskConfig;

  function updateDraft<K extends keyof EntraOpsConfig>(key: K, value: EntraOpsConfig[K]) {
    if (!draft) return;
    onDraftChange({ ...draft, [key]: value });
  }

  function updateNestedDraft<K extends keyof EntraOpsConfig, NK extends keyof EntraOpsConfig[K]>(
    key: K,
    nestedKey: NK,
    value: EntraOpsConfig[K][NK]
  ) {
    if (!draft) return;
    onDraftChange({ ...draft, [key]: { ...(draft[key] as Record<PropertyKey, unknown>), [nestedKey as string]: value } });
  }

  function handlePreview() {
    if (!draft) return;
    const result = configDraftSchema.safeParse(draft);
    if (!result.success) {
      setValidationErrors(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
      return;
    }
    setValidationErrors([]);
    setDiffOpen(true);
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
      setDiffOpen(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Settings</h1>
        <div className="flex items-center gap-3">
          {isDirty && (
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs"
            >
              Unsaved changes
            </Badge>
          )}
          {!isEditing ? (
            <Button size="sm" onClick={onEditStart}>
              <Pencil size={14} className="mr-1" />
              Edit Settings
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handlePreview} disabled={!isDirty}>
                Preview Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
        <SaveBanner savedAt={savedAt} />

        {validationErrors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive mb-1">
              Please fix the following errors before saving:
            </p>
            <ul className="text-sm text-destructive space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 1: Identity & Authentication */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">Identity &amp; Authentication</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ReadOnlyField label="Tenant ID" value={configValues.TenantId} />
            <ReadOnlyField label="Tenant Name" value={configValues.TenantName} />
            <FieldRow label="Authentication Type">
              <select
                className={SELECT_CLASS}
                value={configValues.AuthenticationType}
                onChange={(e) =>
                  updateDraft('AuthenticationType', e.target.value as EntraOpsConfig['AuthenticationType'])
                }
                disabled={!isEditing}
              >
                {AUTH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Client ID">
              <Input
                value={configValues.ClientId}
                onChange={(e) => updateDraft('ClientId', e.target.value)}
                disabled={!isEditing}
                placeholder="Client ID (optional)"
              />
            </FieldRow>
            <FieldRow label="DevOps Platform">
              <select
                className={SELECT_CLASS}
                value={configValues.DevOpsPlatform}
                onChange={(e) =>
                  updateDraft('DevOpsPlatform', e.target.value as EntraOpsConfig['DevOpsPlatform'])
                }
                disabled={!isEditing}
              >
                {DEVOPS_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="RBAC Systems">
              <div className="flex flex-wrap gap-3 pt-1">
                {RBAC_SYSTEMS.map((system) => (
                  <label
                    key={system}
                    className={cn(
                      'flex items-center gap-1.5 text-sm cursor-pointer select-none',
                      !isEditing && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Checkbox
                      checked={configValues.RbacSystems.includes(system)}
                      onCheckedChange={(checked) => {
                        if (!draft) return;
                        const current = draft.RbacSystems;
                        updateDraft(
                          'RbacSystems',
                          checked === true
                            ? [...current, system]
                            : current.filter((s) => s !== system)
                        );
                      }}
                      disabled={!isEditing}
                    />
                    {system}
                  </label>
                ))}
              </div>
            </FieldRow>
          </CardContent>
        </Card>

        {/* Section 2: Automation */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">Automation</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <FieldRow label="Pull Scheduled Trigger">
              <Checkbox
                checked={configValues.WorkflowTrigger.PullScheduledTrigger}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft('WorkflowTrigger', 'PullScheduledTrigger', checked);
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Pull Scheduled Cron">
              <CronPicker
                value={configValues.WorkflowTrigger.PullScheduledCron}
                onChange={(v) => updateNestedDraft('WorkflowTrigger', 'PullScheduledCron', v)}
                disabled={!isEditing || !configValues.WorkflowTrigger.PullScheduledTrigger}
              />
            </FieldRow>
            <FieldRow label="Push After Pull Trigger">
              <Checkbox
                checked={configValues.WorkflowTrigger.PushAfterPullWorkflowTrigger}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft('WorkflowTrigger', 'PushAfterPullWorkflowTrigger', checked);
                }}
                disabled={!isEditing || !configValues.WorkflowTrigger.PullScheduledTrigger}
              />
            </FieldRow>

            <FieldRow label="Auto Classification Update">
              <Checkbox
                checked={configValues.AutomatedClassificationUpdate.ApplyAutomatedClassificationUpdate}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft(
                      'AutomatedClassificationUpdate',
                      'ApplyAutomatedClassificationUpdate',
                      checked
                    );
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Classifications">
              <ArrayInput
                value={configValues.AutomatedClassificationUpdate.Classifications}
                onChange={(v) => updateNestedDraft('AutomatedClassificationUpdate', 'Classifications', v)}
                disabled={
                  !isEditing ||
                  !configValues.AutomatedClassificationUpdate.ApplyAutomatedClassificationUpdate
                }
              />
            </FieldRow>

            <FieldRow label="Auto Scope Update">
              <Checkbox
                checked={
                  configValues.AutomatedControlPlaneScopeUpdate.ApplyAutomatedControlPlaneScopeUpdate
                }
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft(
                      'AutomatedControlPlaneScopeUpdate',
                      'ApplyAutomatedControlPlaneScopeUpdate',
                      checked
                    );
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Classification Source">
              <ArrayInput
                value={configValues.AutomatedControlPlaneScopeUpdate.PrivilegedObjectClassificationSource}
                onChange={(v) =>
                  updateNestedDraft(
                    'AutomatedControlPlaneScopeUpdate',
                    'PrivilegedObjectClassificationSource',
                    v
                  )
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedControlPlaneScopeUpdate.ApplyAutomatedControlPlaneScopeUpdate
                }
              />
            </FieldRow>
            <FieldRow label="EntraOps Scopes">
              <ArrayInput
                value={configValues.AutomatedControlPlaneScopeUpdate.EntraOpsScopes}
                onChange={(v) =>
                  updateNestedDraft('AutomatedControlPlaneScopeUpdate', 'EntraOpsScopes', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedControlPlaneScopeUpdate.ApplyAutomatedControlPlaneScopeUpdate
                }
              />
            </FieldRow>
            <FieldRow label="High Privileged Roles">
              <ArrayInput
                value={configValues.AutomatedControlPlaneScopeUpdate.AzureHighPrivilegedRoles}
                onChange={(v) =>
                  updateNestedDraft('AutomatedControlPlaneScopeUpdate', 'AzureHighPrivilegedRoles', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedControlPlaneScopeUpdate.ApplyAutomatedControlPlaneScopeUpdate
                }
              />
            </FieldRow>
            <FieldRow label="High Privileged Scopes">
              <ArrayInput
                value={configValues.AutomatedControlPlaneScopeUpdate.AzureHighPrivilegedScopes}
                onChange={(v) =>
                  updateNestedDraft('AutomatedControlPlaneScopeUpdate', 'AzureHighPrivilegedScopes', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedControlPlaneScopeUpdate.ApplyAutomatedControlPlaneScopeUpdate
                }
              />
            </FieldRow>
            <FieldRow label="Exposure Criticality Level">
              <Input
                value={configValues.AutomatedControlPlaneScopeUpdate.ExposureCriticalityLevel}
                onChange={(e) =>
                  updateNestedDraft(
                    'AutomatedControlPlaneScopeUpdate',
                    'ExposureCriticalityLevel',
                    e.target.value
                  )
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedControlPlaneScopeUpdate.ApplyAutomatedControlPlaneScopeUpdate
                }
              />
            </FieldRow>

            <FieldRow label="Auto EntraOps Update">
              <Checkbox
                checked={configValues.AutomatedEntraOpsUpdate.ApplyAutomatedEntraOpsUpdate}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft(
                      'AutomatedEntraOpsUpdate',
                      'ApplyAutomatedEntraOpsUpdate',
                      checked
                    );
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Update Scheduled Trigger">
              <Checkbox
                checked={configValues.AutomatedEntraOpsUpdate.UpdateScheduledTrigger}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft('AutomatedEntraOpsUpdate', 'UpdateScheduledTrigger', checked);
                }}
                disabled={!isEditing || !configValues.AutomatedEntraOpsUpdate.ApplyAutomatedEntraOpsUpdate}
              />
            </FieldRow>
            <FieldRow label="Update Scheduled Cron">
              <CronPicker
                value={configValues.AutomatedEntraOpsUpdate.UpdateScheduledCron}
                onChange={(v) => updateNestedDraft('AutomatedEntraOpsUpdate', 'UpdateScheduledCron', v)}
                disabled={
                  !isEditing ||
                  !configValues.AutomatedEntraOpsUpdate.ApplyAutomatedEntraOpsUpdate ||
                  !configValues.AutomatedEntraOpsUpdate.UpdateScheduledTrigger
                }
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Section 3: Integrations */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">Integrations</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <FieldRow label="Ingest to Log Analytics">
              <Checkbox
                checked={configValues.LogAnalytics.IngestToLogAnalytics}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft('LogAnalytics', 'IngestToLogAnalytics', checked);
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Data Collection Rule">
              <Input
                value={configValues.LogAnalytics.DataCollectionRuleName}
                onChange={(e) =>
                  updateNestedDraft('LogAnalytics', 'DataCollectionRuleName', e.target.value)
                }
                disabled={!isEditing || !configValues.LogAnalytics.IngestToLogAnalytics}
              />
            </FieldRow>
            <FieldRow label="DCR Subscription ID">
              <Input
                value={configValues.LogAnalytics.DataCollectionRuleSubscriptionId}
                onChange={(e) =>
                  updateNestedDraft('LogAnalytics', 'DataCollectionRuleSubscriptionId', e.target.value)
                }
                disabled={!isEditing || !configValues.LogAnalytics.IngestToLogAnalytics}
              />
            </FieldRow>
            <FieldRow label="DCR Resource Group">
              <Input
                value={configValues.LogAnalytics.DataCollectionResourceGroupName}
                onChange={(e) =>
                  updateNestedDraft('LogAnalytics', 'DataCollectionResourceGroupName', e.target.value)
                }
                disabled={!isEditing || !configValues.LogAnalytics.IngestToLogAnalytics}
              />
            </FieldRow>
            <FieldRow label="Table Name">
              <Input
                value={configValues.LogAnalytics.TableName}
                onChange={(e) => updateNestedDraft('LogAnalytics', 'TableName', e.target.value)}
                disabled={!isEditing || !configValues.LogAnalytics.IngestToLogAnalytics}
              />
            </FieldRow>

            <FieldRow label="Ingest to Watchlists">
              <Checkbox
                checked={configValues.SentinelWatchLists.IngestToWatchLists}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft('SentinelWatchLists', 'IngestToWatchLists', checked);
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Watchlist Templates">
              <ArrayInput
                value={configValues.SentinelWatchLists.WatchListTemplates}
                onChange={(v) => updateNestedDraft('SentinelWatchLists', 'WatchListTemplates', v)}
                disabled={!isEditing || !configValues.SentinelWatchLists.IngestToWatchLists}
              />
            </FieldRow>
            <FieldRow label="Workload Identity">
              <ArrayInput
                value={configValues.SentinelWatchLists.WatchListWorkloadIdentity}
                onChange={(v) => updateNestedDraft('SentinelWatchLists', 'WatchListWorkloadIdentity', v)}
                disabled={!isEditing || !configValues.SentinelWatchLists.IngestToWatchLists}
              />
            </FieldRow>
            <FieldRow label="Sentinel Workspace">
              <Input
                value={configValues.SentinelWatchLists.SentinelWorkspaceName}
                onChange={(e) =>
                  updateNestedDraft('SentinelWatchLists', 'SentinelWorkspaceName', e.target.value)
                }
                disabled={!isEditing || !configValues.SentinelWatchLists.IngestToWatchLists}
              />
            </FieldRow>
            <FieldRow label="Sentinel Subscription ID">
              <Input
                value={configValues.SentinelWatchLists.SentinelSubscriptionId}
                onChange={(e) =>
                  updateNestedDraft('SentinelWatchLists', 'SentinelSubscriptionId', e.target.value)
                }
                disabled={!isEditing || !configValues.SentinelWatchLists.IngestToWatchLists}
              />
            </FieldRow>
            <FieldRow label="Sentinel Resource Group">
              <Input
                value={configValues.SentinelWatchLists.SentinelResourceGroupName}
                onChange={(e) =>
                  updateNestedDraft('SentinelWatchLists', 'SentinelResourceGroupName', e.target.value)
                }
                disabled={!isEditing || !configValues.SentinelWatchLists.IngestToWatchLists}
              />
            </FieldRow>
            <FieldRow label="Watchlist Prefix">
              <Input
                value={configValues.SentinelWatchLists.WatchListPrefix}
                onChange={(e) =>
                  updateNestedDraft('SentinelWatchLists', 'WatchListPrefix', e.target.value)
                }
                disabled={!isEditing || !configValues.SentinelWatchLists.IngestToWatchLists}
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Section 4: AD Management */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">AD Management</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <FieldRow label="Administrative Units">
              <Checkbox
                checked={
                  configValues.AutomatedAdministrativeUnitManagement.ApplyAdministrativeUnitAssignments
                }
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft(
                      'AutomatedAdministrativeUnitManagement',
                      'ApplyAdministrativeUnitAssignments',
                      checked
                    );
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Apply to Tier Levels">
              <ArrayInput
                value={configValues.AutomatedAdministrativeUnitManagement.ApplyToAccessTierLevel}
                onChange={(v) =>
                  updateNestedDraft('AutomatedAdministrativeUnitManagement', 'ApplyToAccessTierLevel', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedAdministrativeUnitManagement.ApplyAdministrativeUnitAssignments
                }
              />
            </FieldRow>
            <FieldRow label="Filter Object Types">
              <ArrayInput
                value={configValues.AutomatedAdministrativeUnitManagement.FilterObjectType}
                onChange={(v) =>
                  updateNestedDraft('AutomatedAdministrativeUnitManagement', 'FilterObjectType', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedAdministrativeUnitManagement.ApplyAdministrativeUnitAssignments
                }
              />
            </FieldRow>
            <FieldRow label="RBAC Systems (AU)">
              <ArrayInput
                value={configValues.AutomatedAdministrativeUnitManagement.RbacSystems}
                onChange={(v) =>
                  updateNestedDraft('AutomatedAdministrativeUnitManagement', 'RbacSystems', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedAdministrativeUnitManagement.ApplyAdministrativeUnitAssignments
                }
              />
            </FieldRow>
            <FieldRow label="Restricted AU Mode">
              <Input
                value={configValues.AutomatedAdministrativeUnitManagement.RestrictedAuMode}
                onChange={(e) =>
                  updateNestedDraft(
                    'AutomatedAdministrativeUnitManagement',
                    'RestrictedAuMode',
                    e.target.value
                  )
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedAdministrativeUnitManagement.ApplyAdministrativeUnitAssignments
                }
              />
            </FieldRow>

            <FieldRow label="Conditional Access Groups">
              <Checkbox
                checked={
                  configValues.AutomatedConditionalAccessTargetGroups.ApplyConditionalAccessTargetGroups
                }
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft(
                      'AutomatedConditionalAccessTargetGroups',
                      'ApplyConditionalAccessTargetGroups',
                      checked
                    );
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Admin Unit Name">
              <Input
                value={configValues.AutomatedConditionalAccessTargetGroups.AdminUnitName}
                onChange={(e) =>
                  updateNestedDraft('AutomatedConditionalAccessTargetGroups', 'AdminUnitName', e.target.value)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedConditionalAccessTargetGroups.ApplyConditionalAccessTargetGroups
                }
              />
            </FieldRow>
            <FieldRow label="Apply to Tier Levels (CA)">
              <ArrayInput
                value={configValues.AutomatedConditionalAccessTargetGroups.ApplyToAccessTierLevel}
                onChange={(v) =>
                  updateNestedDraft(
                    'AutomatedConditionalAccessTargetGroups',
                    'ApplyToAccessTierLevel',
                    v
                  )
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedConditionalAccessTargetGroups.ApplyConditionalAccessTargetGroups
                }
              />
            </FieldRow>
            <FieldRow label="Filter Object Types (CA)">
              <ArrayInput
                value={configValues.AutomatedConditionalAccessTargetGroups.FilterObjectType}
                onChange={(v) =>
                  updateNestedDraft('AutomatedConditionalAccessTargetGroups', 'FilterObjectType', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedConditionalAccessTargetGroups.ApplyConditionalAccessTargetGroups
                }
              />
            </FieldRow>
            <FieldRow label="Group Prefix">
              <Input
                value={configValues.AutomatedConditionalAccessTargetGroups.GroupPrefix}
                onChange={(e) =>
                  updateNestedDraft('AutomatedConditionalAccessTargetGroups', 'GroupPrefix', e.target.value)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedConditionalAccessTargetGroups.ApplyConditionalAccessTargetGroups
                }
              />
            </FieldRow>
            <FieldRow label="RBAC Systems (CA)">
              <ArrayInput
                value={configValues.AutomatedConditionalAccessTargetGroups.RbacSystems}
                onChange={(v) =>
                  updateNestedDraft('AutomatedConditionalAccessTargetGroups', 'RbacSystems', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedConditionalAccessTargetGroups.ApplyConditionalAccessTargetGroups
                }
              />
            </FieldRow>

            <FieldRow label="RMAU Assignments">
              <Checkbox
                checked={
                  configValues.AutomatedRmauAssignmentsForUnprotectedObjects
                    .ApplyRmauAssignmentsForUnprotectedObjects
                }
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    updateNestedDraft(
                      'AutomatedRmauAssignmentsForUnprotectedObjects',
                      'ApplyRmauAssignmentsForUnprotectedObjects',
                      checked
                    );
                }}
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Apply to Tier Levels (RMAU)">
              <ArrayInput
                value={
                  configValues.AutomatedRmauAssignmentsForUnprotectedObjects.ApplyToAccessTierLevel
                }
                onChange={(v) =>
                  updateNestedDraft(
                    'AutomatedRmauAssignmentsForUnprotectedObjects',
                    'ApplyToAccessTierLevel',
                    v
                  )
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedRmauAssignmentsForUnprotectedObjects
                    .ApplyRmauAssignmentsForUnprotectedObjects
                }
              />
            </FieldRow>
            <FieldRow label="Filter Object Types (RMAU)">
              <ArrayInput
                value={configValues.AutomatedRmauAssignmentsForUnprotectedObjects.FilterObjectType}
                onChange={(v) =>
                  updateNestedDraft(
                    'AutomatedRmauAssignmentsForUnprotectedObjects',
                    'FilterObjectType',
                    v
                  )
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedRmauAssignmentsForUnprotectedObjects
                    .ApplyRmauAssignmentsForUnprotectedObjects
                }
              />
            </FieldRow>
            <FieldRow label="RBAC Systems (RMAU)">
              <ArrayInput
                value={configValues.AutomatedRmauAssignmentsForUnprotectedObjects.RbacSystems}
                onChange={(v) =>
                  updateNestedDraft('AutomatedRmauAssignmentsForUnprotectedObjects', 'RbacSystems', v)
                }
                disabled={
                  !isEditing ||
                  !configValues.AutomatedRmauAssignmentsForUnprotectedObjects
                    .ApplyRmauAssignmentsForUnprotectedObjects
                }
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Section 5: Custom Security Attributes */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">Custom Security Attributes</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <FieldRow label="Privileged User Attribute">
              <Input
                value={configValues.CustomSecurityAttributes.PrivilegedUserAttribute}
                onChange={(e) =>
                  updateNestedDraft('CustomSecurityAttributes', 'PrivilegedUserAttribute', e.target.value)
                }
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Privileged PAW Attribute">
              <Input
                value={configValues.CustomSecurityAttributes.PrivilegedUserPawAttribute}
                onChange={(e) =>
                  updateNestedDraft(
                    'CustomSecurityAttributes',
                    'PrivilegedUserPawAttribute',
                    e.target.value
                  )
                }
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Service Principal Attribute">
              <Input
                value={configValues.CustomSecurityAttributes.PrivilegedServicePrincipalAttribute}
                onChange={(e) =>
                  updateNestedDraft(
                    'CustomSecurityAttributes',
                    'PrivilegedServicePrincipalAttribute',
                    e.target.value
                  )
                }
                disabled={!isEditing}
              />
            </FieldRow>
            <FieldRow label="Work Account Attribute">
              <Input
                value={configValues.CustomSecurityAttributes.UserWorkAccountAttribute}
                onChange={(e) =>
                  updateNestedDraft('CustomSecurityAttributes', 'UserWorkAccountAttribute', e.target.value)
                }
                disabled={!isEditing}
              />
            </FieldRow>
          </CardContent>
        </Card>
      </div>

      <DiffDialog
        open={diffOpen}
        title="Review Settings Changes"
        before={JSON.stringify(diskConfig, null, 2)}
        after={JSON.stringify(draft ?? diskConfig, null, 2)}
        onConfirm={handleConfirm}
        onCancel={() => setDiffOpen(false)}
        loading={saving}
      />
    </div>
  );
}
