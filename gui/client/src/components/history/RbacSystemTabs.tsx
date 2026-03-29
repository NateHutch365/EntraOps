import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangeSummary } from './ChangeSummary';
import { fetchApi } from '@/lib/api';
import type { CommitChangeSummary, RbacSystem, TierSectionChanges } from '../../../../shared/types/api';

const RBAC_ORDER: RbacSystem[] = [
  'EntraID',
  'ResourceApps',
  'IdentityGovernance',
  'DeviceManagement',
  'Defender',
];

interface SingleTabContentProps {
  commitHash: string;
  system: RbacSystem;
  shouldLoad: boolean;
}

function SingleTabContent({ commitHash, system, shouldLoad }: SingleTabContentProps) {
  const [data, setData] = useState<CommitChangeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (shouldLoad && !fetched && !loading) {
    setLoading(true);
    setFetched(true);
    fetchApi<CommitChangeSummary>(`/api/git/commits/${commitHash}/changes?rbac=${system}`)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }

  if (!shouldLoad) return null;

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-destructive py-2">
        Could not compute changes for this commit — the commit may reference files that no longer exist.
      </p>
    );
  }

  if (data) {
    return <ChangeSummary sections={data.sections} />;
  }

  return <p className="text-xs text-muted-foreground py-2">No data for {system} in this commit</p>;
}

interface RbacSystemTabsProps {
  systems: RbacSystem[];
  commitHash: string;
  mode: 'single' | 'compare';
  /** Pre-fetched sections per system — used in compare mode */
  sectionsBySystem?: Partial<Record<RbacSystem, TierSectionChanges[]>>;
}

export function RbacSystemTabs({ systems, commitHash, mode, sectionsBySystem }: RbacSystemTabsProps) {
  const orderedSystems = RBAC_ORDER.filter(s => systems.includes(s));
  const defaultTab = orderedSystems[0] ?? '';

  const [visitedTabs, setVisitedTabs] = useState<Set<RbacSystem>>(() => new Set(defaultTab ? [defaultTab as RbacSystem] : []));

  function handleValueChange(value: string) {
    setVisitedTabs(prev => new Set([...prev, value as RbacSystem]));
  }

  if (orderedSystems.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No RBAC systems affected</p>;
  }

  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleValueChange}>
      <TabsList className="h-auto flex-wrap gap-1 mb-3">
        {orderedSystems.map(system => (
          <TabsTrigger key={system} value={system} className="text-xs">
            {system}
          </TabsTrigger>
        ))}
      </TabsList>

      {orderedSystems.map(system => (
        <TabsContent key={system} value={system}>
          {mode === 'compare' && sectionsBySystem ? (
            <ChangeSummary sections={sectionsBySystem[system] ?? []} />
          ) : (
            <SingleTabContent
              commitHash={commitHash}
              system={system}
              shouldLoad={visitedTabs.has(system)}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
