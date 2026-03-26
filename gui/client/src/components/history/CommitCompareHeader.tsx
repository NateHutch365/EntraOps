import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GitCommit } from '../../../../shared/types/api';

interface CommitCompareHeaderProps {
  from: GitCommit & { fullHash: string };
  to: GitCommit & { fullHash: string };
}

function CommitMeta({
  commit,
  label,
}: {
  commit: GitCommit & { fullHash: string };
  label: string;
}) {
  const formattedDate = new Date(commit.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
      <p className={cn('text-xs font-mono text-muted-foreground break-all')}>
        {commit.fullHash}
      </p>
      <p className="text-sm font-medium leading-snug">{commit.message}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{commit.author}</span>
        <span>·</span>
        <span>{formattedDate}</span>
      </div>
    </div>
  );
}

export function CommitCompareHeader({ from, to }: CommitCompareHeaderProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-3">
      <CommitMeta commit={from} label="From" />

      <div className="hidden lg:flex items-center justify-center">
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>

      <CommitMeta commit={to} label="To" />
    </div>
  );
}
