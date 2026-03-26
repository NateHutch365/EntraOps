import { useMemo, useState } from 'react';
import { Check, Copy, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfigEmptyStateProps {
  onCheckAgain: () => void;
}

const AUTH_TYPES = [
  'UserInteractive',
  'SystemAssignedMSI',
  'UserAssignedMSI',
  'FederatedCredentials',
  'AlreadyAuthenticated',
  'DeviceAuthentication',
] as const;

const RBAC_OPTIONS = [
  'Azure',
  'AzureBilling',
  'EntraID',
  'IdentityGovernance',
  'DeviceManagement',
  'ResourceApps',
  'Defender',
] as const;

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function ConfigEmptyState({ onCheckAgain }: ConfigEmptyStateProps) {
  const [tenantName, setTenantName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [authType, setAuthType] = useState<(typeof AUTH_TYPES)[number]>('FederatedCredentials');
  const [rbacSystems, setRbacSystems] = useState<string[]>([]);
  const [ingestToLogAnalytics, setIngestToLogAnalytics] = useState(false);
  const [ingestToWatchLists, setIngestToWatchLists] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatedCommand = useMemo(() => {
    const name = tenantName || 'contoso.onmicrosoft.com';
    let cmd = `New-EntraOpsConfigFile -TenantName "${name}"`;
    if (showAdvanced) {
      if (authType !== 'FederatedCredentials') cmd += ` -AuthenticationType "${authType}"`;
      if (rbacSystems.length > 0)
        cmd += ` -RbacSystems @(${rbacSystems.map((s) => `"${s}"`).join(',')})`;
      if (ingestToLogAnalytics) cmd += ` -IngestToLogAnalytics $true`;
      if (ingestToWatchLists) cmd += ` -IngestToWatchLists $true`;
    }
    return cmd;
  }, [tenantName, showAdvanced, authType, rbacSystems, ingestToLogAnalytics, ingestToWatchLists]);

  function handleCopy() {
    void navigator.clipboard.writeText(generatedCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleRbac(system: string, checked: boolean | 'indeterminate') {
    if (checked === true) {
      setRbacSystems((prev) => [...prev, system]);
    } else {
      setRbacSystems((prev) => prev.filter((s) => s !== system));
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center max-w-2xl mx-auto">
      <Settings size={48} className="text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">No Configuration File Found</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        EntraOps requires an{' '}
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">EntraOpsConfig.json</code>{' '}
        file in the repository root. Run the PowerShell command below to create one.
      </p>

      <div className="w-full space-y-4 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-name">Tenant Name</Label>
          <Input
            id="tenant-name"
            placeholder="contoso.onmicrosoft.com"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-xs">{showAdvanced ? '▾' : '▸'}</span>
            Show advanced options
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 pl-4 border-l border-border">
              <div className="space-y-1.5">
                <Label>Authentication Type</Label>
                <select
                  className={SELECT_CLASS}
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as (typeof AUTH_TYPES)[number])}
                >
                  {AUTH_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>RBAC Systems</Label>
                <div className="flex flex-wrap gap-3 pt-1">
                  {RBAC_OPTIONS.map((system) => (
                    <label key={system} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                      <Checkbox
                        checked={rbacSystems.includes(system)}
                        onCheckedChange={(checked) => toggleRbac(system, checked)}
                      />
                      {system}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Checkbox
                    checked={ingestToLogAnalytics}
                    onCheckedChange={(checked) => setIngestToLogAnalytics(checked === true)}
                  />
                  Ingest to Log Analytics
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Checkbox
                    checked={ingestToWatchLists}
                    onCheckedChange={(checked) => setIngestToWatchLists(checked === true)}
                  />
                  Ingest to Sentinel Watchlists
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Generated Command</Label>
          <div className="relative rounded-md border border-border bg-muted">
            <pre className="p-3 pr-12 text-sm font-mono leading-5 whitespace-pre-wrap break-all">
              {generatedCommand}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded hover:bg-accent transition-colors"
              aria-label="Copy command"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} className="text-muted-foreground" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Run this in a PowerShell terminal in your EntraOps repository root.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={onCheckAgain}>
            <RefreshCw size={14} className="mr-1" />
            Check Again
          </Button>
        </div>
      </div>
    </div>
  );
}
