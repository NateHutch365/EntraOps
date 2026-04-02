import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ShieldMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrivilegedObject } from '../../../../shared/types/eam';
import { computedTierName } from '../../../../shared/utils/tier.js';

// ----------------------------------------------------------------
// Tier badge colour map — CSS custom properties from globals.css
// ----------------------------------------------------------------
const TIER_BADGE_CLASS: Record<string, string> = {
  ControlPlane: 'border-tier-control text-tier-control',
  ManagementPlane: 'border-tier-management text-tier-management',
  UserAccess: 'border-tier-user text-tier-user',
  Unclassified: 'border-tier-unclassified text-tier-unclassified',
};

// ----------------------------------------------------------------
// Column definitions (6 columns per CONTEXT.md decision)
// Using real PrivilegedObject field names from shared/types/eam.ts
// Columns the user can click to sort (mapped to server PrivilegedObject field names)
const SORTABLE_COLUMNS = new Set([
  'ObjectDisplayName',
  'ObjectAdminTierLevelName',
  'RoleSystem',
  'ObjectType',
]);

export interface ObjectTableProps {
  objects: PrivilegedObject[];
  total: number;
  page: number;       // 1-based
  pageSize: number;
  isLoading: boolean;
  sort: string;       // current sort field (PrivilegedObject key)
  order: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  onPageChange: (page: number) => void;
  onRowClick: (object: PrivilegedObject) => void;
  // NEW — all optional for backward compatibility:
  onExclude?: (object: PrivilegedObject) => void;
  excludedIds?: Set<string>;
  loadingIds?: Set<string>;
}

export function ObjectTable({
  objects,
  total,
  page,
  pageSize,
  isLoading,
  sort,
  order,
  onSortChange,
  onPageChange,
  onRowClick,
  onExclude,
  excludedIds,
  loadingIds,
}: ObjectTableProps) {
  const columns = useMemo((): ColumnDef<PrivilegedObject>[] => [
  {
    accessorKey: 'ObjectDisplayName',
    header: 'Display Name',
    cell: ({ row }) => {
      const isExcluded = excludedIds?.has(row.original.ObjectId) ?? false;
      return (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{row.original.ObjectDisplayName}</p>
            {isExcluded && (
              <Badge
                variant="outline"
                className="text-xs font-medium text-muted-foreground border-muted-foreground/40"
                title="This object is in the Global Exclusions list and will be skipped by the classification engine"
              >
                Excluded
              </Badge>
            )}
          </div>
          {row.original.ObjectUserPrincipalName && (
            <p className="text-xs text-muted-foreground truncate">
              {row.original.ObjectUserPrincipalName}
            </p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'ObjectType',
    header: 'Object Type',
    cell: ({ getValue }) => (
      <Badge variant="outline" className="text-xs font-normal">
        {getValue() as string}
      </Badge>
    ),
  },
  {
    accessorKey: 'ObjectAdminTierLevelName',
    header: 'Tier',
    cell: ({ getValue, row }) => {
      const tier = getValue() as string;
      if (tier === 'Unclassified') {
        const suggestedTier = computedTierName(row.original.Classification ?? []);
        if (suggestedTier !== null) {
          return (
            <Badge
              variant="outline"
              className={cn('text-xs font-medium border-dashed', TIER_BADGE_CLASS[suggestedTier] ?? '')}
            >
              {suggestedTier}
            </Badge>
          );
        }
      }
      return (
        <Badge
          variant="outline"
          className={cn('text-xs font-medium', TIER_BADGE_CLASS[tier] ?? '')}
        >
          {tier}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'RoleSystem',
    header: 'RBAC System',
    cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
  },
  {
    // PIM Type: derived from RoleAssignments — show most elevated assignment
    id: 'pimType',
    header: 'PIM Type',
    accessorFn: (row) => {
      const types = new Set(row.RoleAssignments?.map(r => r.PIMAssignmentType) ?? []);
      if (types.has('Eligible')) return 'Eligible';
      if (types.has('Permanent')) return 'Permanent';
      return null;
    },
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? (
        <Badge variant="secondary" className="text-xs">{val}</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  },
  {
    accessorKey: 'OnPremSynchronized',
    header: 'On-Prem Sync',
    cell: ({ getValue }) => {
      const val = getValue() as boolean | null;
      if (val === null || val === undefined) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
      return (
        <Badge variant={val ? 'outline' : 'secondary'} className="text-xs">
          {val ? 'On-Prem' : 'Cloud'}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: () => <span className="block text-right">Actions</span>,
    cell: ({ row }) => {
      const obj = row.original;
      const isExcluded = excludedIds?.has(obj.ObjectId) ?? false;
      const isExcluding = loadingIds?.has(obj.ObjectId) ?? false;

      if (isExcluded) {
        return (
          <div className="flex justify-end">
            <Badge
              variant="outline"
              className="text-xs font-medium text-muted-foreground border-muted-foreground/40"
              title="This object is in the Global Exclusions list and will be skipped by the classification engine"
            >
              Excluded
            </Badge>
          </div>
        );
      }

      return (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1"
            disabled={isExcluding}
            aria-label={`Exclude ${obj.ObjectDisplayName} from classification`}
            onClick={(e) => {
              e.stopPropagation();
              onExclude?.(obj);
            }}
          >
            {isExcluding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ShieldMinus size={14} />
            )}
            Exclude
          </Button>
        </div>
      );
    },
  },

  ], [excludedIds, loadingIds, onExclude]);

  // CRITICAL: getCoreRowModel ONLY — no getSortedRowModel or getPaginationRowModel
  // All pagination, sorting, and filtering is server-side (manualPagination: true)
  const table = useReactTable({
    data: objects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: total,
  });

  const pageCount = Math.ceil(total / pageSize) || 1;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function SortIcon({ columnId }: { columnId: string }) {
    if (sort !== columnId) {
      return <ArrowUpDown size={14} className="ml-1.5 text-muted-foreground" />;
    }
    return order === 'asc'
      ? <ArrowUp size={14} className="ml-1.5" />
      : <ArrowDown size={14} className="ml-1.5" />;
  }

  return (
    <div className="space-y-3">
      {/* Table with loading overlay — table layout preserved while fetching */}
      <div className="relative rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => {
                  const colId = header.column.id;
                  const sortable = SORTABLE_COLUMNS.has(colId);
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(sortable && 'cursor-pointer select-none hover:text-foreground')}
                      onClick={sortable ? () => onSortChange(colId) : undefined}
                    >
                      <span className="flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortable && <SortIcon columnId={colId} />}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  excludedIds?.has(row.original.ObjectId) && 'opacity-60',
                )}
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {objects.length === 0 && !isLoading && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12 text-sm"
                >
                  No objects match the current filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Loading overlay — semi-transparent, preserves table layout (RESEARCH.md Pitfall 4) */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-fluent-accent" size={28} />
          </div>
        )}
      </div>

      {/* Pagination controls — updates URL page param */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? 'No results'
            : `${from}–${to} of ${total} objects`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          <span className="text-xs font-medium">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
