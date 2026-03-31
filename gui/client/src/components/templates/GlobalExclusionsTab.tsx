import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';

interface GlobalExclusionsTabProps {
  onSaved?: () => void;
}

export function GlobalExclusionsTab({ onSaved: _onSaved }: GlobalExclusionsTabProps) {
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/templates/global')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ exclusions: string[] }>;
      })
      .then((data) => setExclusions(data.exclusions))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Exclusions are managed on the dedicated{' '}
          <Link to="/exclusions" className="text-fluent-accent hover:underline">
            Exclusions page →
          </Link>
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : exclusions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No excluded principals.</p>
      ) : (
        <div className="space-y-1">
          {exclusions.map((guid) => (
            <div key={guid} className="rounded-md border px-3 py-1.5">
              <code className="text-sm font-mono text-muted-foreground">{guid}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
