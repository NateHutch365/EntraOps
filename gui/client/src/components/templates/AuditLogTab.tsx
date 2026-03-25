import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface AuditEntry {
  timestamp: string;
  action: string;
  template: string;
}

export function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch('/api/templates/audit')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ entries: AuditEntry[] }>;
      })
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Records when classification templates are saved.
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit entries yet. Save a template to create the first entry.</p>
      ) : (
        <div className="rounded-md border divide-y divide-border text-sm font-mono">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-2">
              <span className="text-muted-foreground whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span className="capitalize">{entry.action}</span>
              <span className="text-foreground">{entry.template}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
