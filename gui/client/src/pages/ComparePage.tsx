import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { parseAsString, useQueryState } from 'nuqs';
import { useCompare } from '@/hooks/useCompare';
import { CommitCompareHeader } from '@/components/history/CommitCompareHeader';
import { RbacSystemTabs } from '@/components/history/RbacSystemTabs';
import { RawDiffViewer } from '@/components/history/RawDiffViewer';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function ComparePage() {
  const [from] = useQueryState('from', parseAsString);
  const [to] = useQueryState('to', parseAsString);

  const { data, isLoading, error } = useCompare({ from, to });

  if (!from || !to) {
    return (
      <div className="p-6 space-y-4">
        <Link
          to="/history"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to History
        </Link>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            Missing comparison hashes. Go back to History and select two commits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Link
        to="/history"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> Back to History
      </Link>

      <h1 className="text-[22px] font-semibold">Compare Commits</h1>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}

      {/* Loaded state */}
      {data && !isLoading && (
        <>
          {/* Header: side-by-side commit metadata */}
          <CommitCompareHeader from={data.from} to={data.to} />

          <Separator />

          {/* Structured changes: RBAC system tabs */}
          <div>
            <h2 className="text-base font-semibold mb-3">Structured Changes</h2>
            {data.affectedSystems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No PrivilegedEAM/ changes between these commits
              </p>
            ) : (
              <RbacSystemTabs
                systems={data.affectedSystems}
                commitHash=""
                mode="compare"
                sectionsBySystem={data.sectionsBySystem}
              />
            )}
          </div>

          <Separator />

          {/* Raw diff */}
          <div>
            <h2 className="text-base font-semibold mb-3">Raw Diff</h2>
            <RawDiffViewer diff={data.rawDiff} />
          </div>
        </>
      )}
    </div>
  );
}
