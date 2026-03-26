import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { EntraOpsConfig } from '../../../shared/types/config';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfigForm } from '@/components/settings/ConfigForm';
import { ConfigEmptyState } from '@/components/settings/ConfigEmptyState';

export function SettingsPage() {
  const [diskConfig, setDiskConfig] = useState<EntraOpsConfig | null>(null);
  const [draft, setDraft] = useState<EntraOpsConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState(0);
  const [configExists, setConfigExists] = useState(true);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object' && 'TenantId' in data) {
          setDiskConfig(data as EntraOpsConfig);
          setConfigExists(true);
        } else {
          setDiskConfig(null);
          setConfigExists(false);
        }
      })
      .catch(() => {
        setDiskConfig(null);
        setConfigExists(false);
      })
      .finally(() => setLoading(false));
  }, [fetchTrigger]);

  const isDirty =
    isEditing &&
    draft !== null &&
    diskConfig !== null &&
    JSON.stringify(draft) !== JSON.stringify(diskConfig);

  function handleEditStart() {
    if (!diskConfig) return;
    setDraft(structuredClone(diskConfig));
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(null);
    setIsEditing(false);
  }

  async function handleSave() {
    if (!draft) return;
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setDiskConfig(structuredClone(draft));
      setIsEditing(false);
      setDraft(null);
      setSavedAt(Date.now());
    } else if (res.status === 422) {
      const data = (await res.json()) as {
        error: Array<{ path: (string | number)[]; message: string }>;
      };
      const messages =
        data.error?.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') ?? 'Validation error';
      toast.error('Save failed', { description: messages });
    } else {
      toast.error('Save failed', { description: 'Unexpected error — check server logs.' });
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!configExists) {
    return (
      <div className="p-6">
        <ConfigEmptyState onCheckAgain={() => setFetchTrigger((t) => t + 1)} />
      </div>
    );
  }

  if (!diskConfig) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConfigForm
        diskConfig={diskConfig}
        draft={draft}
        isEditing={isEditing}
        isDirty={isDirty}
        savedAt={savedAt}
        onEditStart={handleEditStart}
        onCancel={handleCancel}
        onDraftChange={setDraft}
        onSave={handleSave}
      />
    </div>
  );
}
