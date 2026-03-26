import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StickyCompareBarProps {
  selectedHashes: string[];
  onCompare: () => void;
}

export function StickyCompareBar({ selectedHashes, onCompare }: StickyCompareBarProps) {
  const count = selectedHashes.length;

  if (count === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-card border-t shadow-lg',
        'flex items-center justify-between px-6 py-3',
        'transition-all duration-200 ease-in-out',
        // Offset for sidebar: sidebar is 220px expanded or 56px collapsed.
        // We use ml on the inner content area; the bar itself is full-width and uses padding.
        'ml-0'
      )}
      style={{ marginLeft: 'var(--sidebar-width, 0px)' }}
    >
      <span className="text-sm text-muted-foreground">
        {count === 1
          ? 'Select one more commit to compare'
          : `Comparing ${count} commits`}
      </span>

      {count === 2 && (
        <Button
          size="sm"
          className="bg-fluent-accent hover:bg-fluent-accent/90 text-white"
          onClick={onCompare}
        >
          Compare Commits
        </Button>
      )}
    </div>
  );
}
