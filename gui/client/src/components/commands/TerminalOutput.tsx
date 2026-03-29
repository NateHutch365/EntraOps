// SECURITY NOTE: dangerouslySetInnerHTML is used here intentionally.
// Content exclusively comes from child_process.spawn() output (our own pwsh process),
// never from user-supplied text. The app is local-only (127.0.0.1 bound).
import Convert from 'ansi-to-html';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CommandStatus } from '../../../../shared/types/commands';

interface TerminalOutputProps {
  htmlContent: string;
  status: CommandStatus;
  onStop: () => void;
}

const STATUS_BADGE: Record<CommandStatus, { label: string; className: string }> = {
  idle:      { label: '',             className: 'hidden' },
  running:   { label: '● Running',   className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: '✓ Complete',  className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  failed:    { label: '✕ Failed',    className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  stopped:   { label: '◼ Stopped',  className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

export function TerminalOutput({ htmlContent, status, onStop }: TerminalOutputProps) {
  const scrollRef = useRef<HTMLPreElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll: track bottom as output streams. Pause when user scrolls up.
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [htmlContent, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Consider "at bottom" if within 32px of the bottom
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 32);
  }, []);

  const badge = STATUS_BADGE[status];

  return (
    <div className="flex flex-col rounded-md border border-border overflow-hidden bg-[#0d0d0d]">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-[#151515]">
        <span className="text-xs font-mono text-muted-foreground">Output</span>
        <div className="flex items-center gap-2">
          {status !== 'idle' && (
            <Badge
              variant="outline"
              className={cn('text-xs font-mono px-2 py-0.5', badge.className)}
            >
              {badge.label}
            </Badge>
          )}
          {status === 'running' && (
            <button
              onClick={onStop}
              className="text-xs px-2 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors font-mono"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Terminal output area */}
      <pre
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-80 overflow-y-auto p-3 text-xs font-mono text-green-300 leading-normal whitespace-pre-wrap break-all"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: htmlContent || '<span class="text-zinc-600">No output yet — run a command above.</span>',
        }}
      />
    </div>
  );
}

// Re-export the Convert class so RunCommandsPage can create a stateful converter instance
export { Convert as AnsiConvert };
