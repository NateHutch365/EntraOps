import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SaveBannerProps {
  savedAt: number;
}

export function SaveBanner({ savedAt }: SaveBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (savedAt > 0) {
      setDismissed(false);
    }
  }, [savedAt]);

  if (dismissed || savedAt === 0) return null;

  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          Changes saved to disk — remember to commit to git before running EntraOps classification.
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 ml-2"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X size={14} />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
