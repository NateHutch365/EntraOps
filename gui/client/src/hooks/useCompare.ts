import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import type { ComparisonResult, GitCommit, RbacSystem, TierSectionChanges } from '../../../shared/types/api';

export interface UseCompareParams {
  from: string | null;
  to: string | null;
}

export interface AggregatedComparison {
  from: GitCommit & { fullHash: string };
  to: GitCommit & { fullHash: string };
  /** RBAC systems that have any actual changes between the two commits */
  affectedSystems: RbacSystem[];
  /** Sections keyed by RBAC system (all 5 systems fetched, even if empty) */
  sectionsBySystem: Partial<Record<RbacSystem, TierSectionChanges[]>>;
  /** Concatenated raw diffs for all systems with changes */
  rawDiff: string;
}

interface UseCompareResult {
  data: AggregatedComparison | null;
  isLoading: boolean;
  error: string | null;
}

const RBAC_SYSTEMS: RbacSystem[] = [
  'EntraID',
  'ResourceApps',
  'IdentityGovernance',
  'DeviceManagement',
  'Defender',
];

function hasSectionChanges(sections: TierSectionChanges[]): boolean {
  return sections.some(
    s => s.added.length > 0 || s.removed.length > 0 || s.tierChanged.length > 0,
  );
}

export function useCompare({ from, to }: UseCompareParams): UseCompareResult {
  const [data, setData] = useState<AggregatedComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData(null);

    const requests = RBAC_SYSTEMS.map(system =>
      fetchApi<ComparisonResult>(
        `/api/git/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&rbac=${system}`,
      ),
    );

    Promise.all(requests)
      .then(results => {
        if (cancelled) return;

        const first = results[0];
        const sectionsBySystem: Partial<Record<RbacSystem, TierSectionChanges[]>> = {};
        const rawDiffParts: string[] = [];

        RBAC_SYSTEMS.forEach((system, i) => {
          const result = results[i];
          sectionsBySystem[system] = result.sections;
          if (result.rawDiff) {
            rawDiffParts.push(result.rawDiff);
          }
        });

        const affectedSystems = RBAC_SYSTEMS.filter(
          system => hasSectionChanges(sectionsBySystem[system] ?? []),
        );

        setData({
          from: first.from,
          to: first.to,
          affectedSystems,
          sectionsBySystem,
          rawDiff: rawDiffParts.join('\n'),
        });
        setIsLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return { data, isLoading, error };
}
