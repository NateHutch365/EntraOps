import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { User, Bot, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ExclusionItem {
  guid: string;
  displayName: string | null;
  objectType: string | null;
  resolved: boolean;
}

export function ExclusionsPage() {
  const [items, setItems] = useState<ExclusionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasRemovedOne, setHasRemovedOne] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const invalidate = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/exclusions')
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json() as Promise<ExclusionItem[]>;
      })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRemove = useCallback(
    (guid: string) => {
      fetch(`/api/exclusions/${guid}`, { method: 'DELETE' })
        .then((res) => {
          if (res.ok) {
            setItems((prev) => prev.filter((i) => i.guid !== guid));
            setHasRemovedOne(true);
            toast('Exclusion removed');
          } else {
            toast.error('Failed to remove exclusion');
          }
        })
        .catch(() => {
          toast.error('Failed to remove exclusion');
        });
    },
    [],
  );

  // Silence unused invalidate lint — kept for consistency with Phase 8 pattern
  void invalidate;

  const unresolvedCount = items.filter((i) => !i.resolved).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Exclusions</h1>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs">
              {items.length} {items.length === 1 ? 'exclusion' : 'exclusions'}
            </Badge>
          )}
          {!isLoading && unresolvedCount > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {unresolvedCount} unresolved
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Objects excluded from EntraOps tier classification. Changes take effect on the next
          classification run.{' '}
          <Link to="/run" className="text-fluent-accent hover:underline">
            Run Classification →
          </Link>
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Info banner — only after ≥1 remove, dismissible (D-04) */}
        {hasRemovedOne && !bannerDismissed && (
          <div className="flex items-start justify-between rounded-md border border-border bg-muted px-4 py-3 mb-4 text-sm">
            <span>
              Classification data may be stale — run{' '}
              <code className="font-mono">Save-EntraOpsPrivilegedEAMJson</code> to update.{' '}
              <Link to="/run" className="text-fluent-accent hover:underline">
                Go to Command Runner →
              </Link>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss banner"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        {/* Error state */}
        {error && (
          <p className="text-sm text-destructive mb-4">Failed to load exclusions: {error}</p>
        )}

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-normal text-muted-foreground">Display Name</TableHead>
              <TableHead className="font-normal text-muted-foreground w-[340px]">Object ID</TableHead>
              <TableHead className="font-normal text-muted-foreground w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-72 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20 rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12">
                  <p className="text-sm font-semibold text-foreground">No exclusions configured</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Objects excluded via the Object Browser or Reclassify screen will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.guid} className={!item.resolved ? 'opacity-60' : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.resolved && item.objectType && (
                        <span className="text-muted-foreground">
                          {item.objectType === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </span>
                      )}
                      <span className={!item.resolved ? 'text-muted-foreground text-sm' : 'text-sm'}>
                        {item.resolved ? item.displayName : 'Unknown object'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors cursor-copy"
                      title="Click to copy GUID"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(item.guid)
                          .then(() => toast('GUID copied'))
                          .catch(() => undefined)
                      }
                    >
                      {item.guid}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(item.guid)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
