import { useState } from 'react';
import { useNavigate } from 'react-router';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useCommits } from '@/hooks/useCommits';
import { CommitRow } from '@/components/history/CommitRow';
import { RbacFilterBar } from '@/components/history/RbacFilterBar';
import { StickyCompareBar } from '@/components/history/StickyCompareBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { RbacSystem } from '../../../shared/types/api';

const PAGE_SIZE = 20;

export function HistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set());
  const [selectedHashes, setSelectedHashes] = useState<string[]>([]);
  const [rbacFilter, setRbacFilter] = useState<RbacSystem[]>([]);

  const { data, isLoading, error } = useCommits({ page: page ?? 1, pageSize: PAGE_SIZE });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const isFiltered = rbacFilter.length > 0;

  function handleToggleExpand(hash: string) {
    setExpandedHashes(prev => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  }

  function handleRbacFilterChange(systems: RbacSystem[]) {
    setRbacFilter(systems);
    // Reset to page 1 when filter changes — filtered results are always a single page
    void setPage(1);
  }

  function handleCheckChange(hash: string, checked: boolean) {
    if (checked) {
      setSelectedHashes(prev => {
        // Max 2: deselect oldest if already at 2
        const next = prev.length >= 2 ? prev.slice(1) : prev;
        return [...next, hash];
      });
    } else {
      setSelectedHashes(prev => prev.filter(h => h !== hash));
    }
  }

  function handleCompare() {
    if (selectedHashes.length === 2) {
      void navigate(`/history/compare?from=${selectedHashes[0]}&to=${selectedHashes[1]}`);
    }
  }

  // Client-side RBAC filter
  const visibleCommits = data?.commits
    ? rbacFilter.length > 0
      ? data.commits.filter(c => c.affectedSystems.some(s => rbacFilter.includes(s)))
      : data.commits
    : [];

  return (
    <div className="p-6 space-y-4 pb-20">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-semibold">Change History</h1>
        <p className="text-sm text-muted-foreground">
          Browse EAM changes across classification runs
        </p>
      </div>

      {/* RBAC filter chips */}
      <RbacFilterBar selected={rbacFilter} onChange={handleRbacFilterChange} />

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            Failed to load commit history — check that this folder is a valid git repository.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="rounded-md border border-border overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data && data.total === 0 && (
        <div className="text-center py-16">
          <h2 className="text-lg font-semibold">No change history yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Run{' '}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
              Save-EntraOpsPrivilegedEAMJson
            </code>{' '}
            and commit the results to start tracking changes. History will appear here after the
            first commit touching{' '}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
              PrivilegedEAM/
            </code>
            .
          </p>
        </div>
      )}

      {/* Commit list */}
      {!isLoading && !error && visibleCommits.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          {visibleCommits.map(commit => (
            <CommitRow
              key={commit.hash}
              commit={commit}
              isChecked={selectedHashes.includes(commit.hash)}
              onCheckChange={handleCheckChange}
              isExpanded={expandedHashes.has(commit.hash)}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </div>
      )}

      {/* Pagination — hidden when a client-side filter is active (filtered results are single-page) */}
      {!isLoading && !error && totalPages > 1 && !isFiltered && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, (p ?? 1) - 1))}
          >
            ← Prev
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {page ?? 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, (p ?? 1) + 1))}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Sticky compare bar */}
      <StickyCompareBar selectedHashes={selectedHashes} onCompare={handleCompare} />
    </div>
  );
}
