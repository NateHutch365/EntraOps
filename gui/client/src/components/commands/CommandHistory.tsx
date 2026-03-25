import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CommandOutcome, RunHistoryRecord } from '../../../../shared/types/commands';

interface CommandHistoryProps {
  records: RunHistoryRecord[];
  onSelect: (record: RunHistoryRecord) => void;
}

const OUTCOME_STYLE: Record<CommandOutcome, string> = {
  completed: 'text-green-400',
  failed:    'text-red-400',
  stopped:   'text-zinc-400',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function CommandHistory({ records, onSelect }: CommandHistoryProps) {
  if (records.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No commands run yet. Results will appear here.
      </p>
    );
  }

  return (
    <ScrollArea className="h-48">
      <div className="flex flex-col gap-1">
        {[...records].reverse().map((record) => (
          <button
            key={record.id}
            onClick={() => onSelect(record)}
            className={cn(
              'flex items-center justify-between text-left px-3 py-2 rounded-md text-xs font-mono',
              'bg-muted hover:bg-muted/80 border border-transparent hover:border-border transition-colors',
              'group w-full'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn('shrink-0', OUTCOME_STYLE[record.outcome])}>
                {record.outcome === 'completed' ? '✓' : record.outcome === 'failed' ? '✕' : '◼'}
              </span>
              <span className="truncate text-foreground">{record.cmdlet}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
              <span>{formatDuration(record.durationSeconds)}</span>
              <span>{formatDate(record.startedAt)}</span>
              <span className="text-fluent-accent opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                Re-run ↑
              </span>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
