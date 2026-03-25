import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DiffDialog } from '@/components/templates/DiffDialog';

const UuidSchema = z.string().uuid();

interface GlobalExclusionsTabProps {
  onSaved: () => void;
}

export function GlobalExclusionsTab({ onSaved }: GlobalExclusionsTabProps) {
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [originalExclusions, setOriginalExclusions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffOpen, setDiffOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/templates/global')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ exclusions: string[] }>;
      })
      .then((data) => {
        setExclusions(data.exclusions);
        setOriginalExclusions(data.exclusions);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function handleAdd() {
    const trimmed = inputValue.trim();
    const result = UuidSchema.safeParse(trimmed);
    if (!result.success) {
      setInputError('Invalid UUID format — paste a valid GUID (e.g. 00000000-0000-0000-0000-000000000000)');
      return;
    }
    if (exclusions.includes(trimmed)) {
      setInputError('This GUID is already in the list');
      return;
    }
    setExclusions((prev) => [...prev, trimmed]);
    setInputValue('');
    setInputError(null);
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : exclusions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No excluded principals.</p>
      ) : (
        <div className="space-y-1">
          {exclusions.map((guid, i) => (
            <div key={guid} className="flex items-center justify-between rounded-md border px-3 py-1.5">
              <code className="text-sm font-mono">{guid}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setExclusions((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove GUID"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setInputError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add GUID (e.g. 00000000-0000-0000-0000-000000000000)"
            className="font-mono text-sm"
          />
          <Button variant="outline" onClick={handleAdd}>
            Add
          </Button>
        </div>
        {inputError && <p className="text-destructive text-xs">{inputError}</p>}
      </div>

      <Button
        variant="outline"
        onClick={() => setDiffOpen(true)}
        disabled={JSON.stringify(exclusions) === JSON.stringify(originalExclusions)}
      >
        Preview Changes
      </Button>

      <DiffDialog
        open={diffOpen}
        title="Preview: Classification/Global.json"
        before={JSON.stringify([{ ExcludedPrincipalId: originalExclusions }], null, 2)}
        after={JSON.stringify([{ ExcludedPrincipalId: exclusions }], null, 2)}
        loading={saving}
        onCancel={() => setDiffOpen(false)}
        onConfirm={async () => {
          setSaving(true);
          try {
            const res = await fetch('/api/templates/global', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ exclusions }),
            });
            if (!res.ok) {
              const err = await res.json() as { error: string };
              setInputError(String(err.error));
              setDiffOpen(false);
              return;
            }
            setOriginalExclusions([...exclusions]);
            setDiffOpen(false);
            onSaved();
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
