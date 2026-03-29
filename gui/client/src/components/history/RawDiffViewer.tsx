import { cn } from '@/lib/utils';

interface RawDiffViewerProps {
  diff: string;
}

function getLineClass(line: string): string {
  if (line.startsWith('diff --git')) {
    return 'text-muted-foreground font-bold';
  }
  if (line.startsWith('@@')) {
    return 'text-blue-400 font-semibold';
  }
  if (line.startsWith('+++') || line.startsWith('---')) {
    return 'text-muted-foreground';
  }
  if (line.startsWith('+')) {
    return 'bg-green-950/20 text-green-300';
  }
  if (line.startsWith('-')) {
    return 'bg-red-950/20 text-red-300';
  }
  return 'text-muted-foreground';
}

export function RawDiffViewer({ diff }: RawDiffViewerProps) {
  if (!diff) {
    return (
      <p className="text-xs text-muted-foreground py-2">No raw diff available</p>
    );
  }

  const lines = diff.split('\n');

  return (
    <pre className="overflow-x-auto text-xs font-mono bg-muted rounded-lg p-4 leading-5">
      {lines.map((line, i) => (
        <span key={i} className={cn('block', getLineClass(line))}>
          {line || '\u00A0'}
        </span>
      ))}
    </pre>
  );
}
