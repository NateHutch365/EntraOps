import { diffLines } from 'diff';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface DiffDialogProps {
  open: boolean;
  title: string;
  before: string;
  after: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function DiffDialog({ open, title, before, after, onConfirm, onCancel, loading }: DiffDialogProps) {
  const changes = diffLines(before, after);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] rounded border border-border">
          <pre className="p-3 text-xs font-mono leading-5">
            {changes.map((change, i) => (
              <span
                key={i}
                className={
                  change.added
                    ? 'block bg-green-950 text-green-300'
                    : change.removed
                    ? 'block bg-red-950 text-red-300'
                    : 'block text-muted-foreground'
                }
              >
                {change.value}
              </span>
            ))}
          </pre>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Saving…' : 'Confirm & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
