import { useDashboard } from '@/hooks/useDashboard';
import { KPICard } from '@/components/dashboard/KPICard';
import { TierBarChart } from '@/components/dashboard/TierBarChart';
import { RecentCommits } from '@/components/dashboard/RecentCommits';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Terminal } from 'lucide-react';

// Empty state component (DASH-07)
function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <Terminal size={48} className="text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">No privileged identity data yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Run{' '}
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
          Save-EntraOpsPrivilegedEAMJson
        </code>{' '}
        in your PowerShell terminal to generate EAM data, then check again.
      </p>
      <Button
        onClick={onRefresh}
        className="bg-fluent-accent hover:bg-fluent-accent-hover text-white"
      >
        Check Again
      </Button>
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="flex-1 h-36 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[250px] w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}

// Tier display order: ControlPlane → ManagementPlane → UserAccess (highest risk first, per UI-SPEC.md)
const TIER_ORDER = ['ControlPlane', 'ManagementPlane', 'UserAccess'] as const;

export function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertCircle size={20} />
            <p className="text-sm">Failed to load dashboard: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.hasData) {
    return <EmptyState onRefresh={refetch} />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards row — 3 equal-width cards per CONTEXT.md */}
      <div className="flex gap-4">
        {TIER_ORDER.map(tier => (
          <KPICard
            key={tier}
            tier={tier}
            count={data.tiers[tier]}
            permanentCount={data.pimTypes[tier].Permanent}
            eligibleCount={data.pimTypes[tier].Eligible}
          />
        ))}
      </div>

      {/* RBAC stacked horizontal bar chart */}
      <TierBarChart data={data.rbacBreakdown} />

      {/* Utility widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DataFreshness freshness={data.freshness} />
        <RecentCommits commits={data.recentCommits} />
      </div>
    </div>
  );
}
