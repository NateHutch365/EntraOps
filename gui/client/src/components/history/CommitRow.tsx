import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { RbacSystemTabs } from './RbacSystemTabs';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CommitListItem, RbacSystem } from '../../../../shared/types/api';

interface CommitRowProps {
  commit: CommitListItem;
  isChecked: boolean;
  onCheckChange: (hash: string, checked: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: (hash: string) => void;
}

interface AffectedSystemsResponse {
  systems: RbacSystem[];
}

function ExpandedContent({ commit }: { commit: CommitListItem }) {
  const [systems, setSystems] = useState<RbacSystem[] | null>(
    commit.hasPrivilegedEAMChanges ? null : []
  );
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(!commit.hasPrivilegedEAMChanges);

  if (!commit.hasPrivilegedEAMChanges) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        No PrivilegedEAM/ changes in this commit
      </p>
    );
  }

  if (!fetched && !loading) {
    setLoading(true);
    setFetched(true);
    fetchApi<AffectedSystemsResponse>(`/api/git/commits/${commit.fullHash}/systems`)
      .then(d => {
        setSystems(d.systems);
        setLoading(false);
      })
      .catch(() => {
        setSystems([]);
        setLoading(false);
      });
  }

  if (loading || systems === null) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (systems.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        No PrivilegedEAM/ changes in this commit
      </p>
    );
  }

  return (
    <RbacSystemTabs
      systems={systems}
      commitHash={commit.fullHash}
      mode="single"
    />
  );
}

export function CommitRow({ commit, isChecked, onCheckChange, isExpanded, onToggleExpand }: CommitRowProps) {
  const formattedDate = new Date(commit.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="border-b border-border last:border-0">
      {/* Main commit row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onToggleExpand(commit.hash)}
      >
        {/* Checkbox — stop propagation so click doesn't also toggle expand */}
        <span onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => onCheckChange(commit.hash, !!checked)}
            aria-label={`Select commit ${commit.hash}`}
          />
        </span>

        <span className={cn('text-xs font-mono text-muted-foreground shrink-0')}>
          {commit.hash.slice(0, 7)}
        </span>

        <span className="flex-1 text-sm truncate">{commit.message}</span>

        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {commit.author}
        </span>

        <span className="text-xs text-muted-foreground shrink-0">
          {formattedDate}
        </span>
      </div>

      {/* Expanded change summary */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-secondary/30">
          <ExpandedContent commit={commit} />
        </div>
      )}
    </div>
  );
}
