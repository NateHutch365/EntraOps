import { useEffect, useState } from 'react';
import type { TemplateName, TierBlock } from '../../../shared/types/templates';
import { TEMPLATE_NAMES } from '../../../shared/types/templates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TierAccordion } from '@/components/templates/TierAccordion';
import { GlobalExclusionsTab } from '@/components/templates/GlobalExclusionsTab';
import { SaveBanner } from '@/components/templates/SaveBanner';

const TAB_LABELS: Record<TemplateName, string> = {
  Classification_AadResources: 'AadResources',
  Classification_AppRoles: 'AppRoles',
  Classification_Defender: 'Defender',
  Classification_DeviceManagement: 'DeviceManagement',
  Classification_IdentityGovernance: 'IdentityGovernance',
};

export function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateName | 'global'>('Classification_AadResources');
  const [templateData, setTemplateData] = useState<Partial<Record<TemplateName, TierBlock[]>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    if (activeTab === 'global') return;
    const name = activeTab as TemplateName;
    if (templateData[name]) return;

    setLoading(true);
    setError(null);
    fetch(`/api/templates/${name}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ name: TemplateName; tiers: TierBlock[] }>;
      })
      .then((data) => {
        setTemplateData((prev) => ({ ...prev, [name]: data.tiers }));
      })
      .catch(() => {
        setError('Failed to load template');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTab]);

  return (
    <div className="p-6">
      <SaveBanner savedAt={savedAt} />
      <h1 className="text-2xl font-bold mb-6">Classification Templates</h1>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TemplateName | 'global')}
      >
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {TEMPLATE_NAMES.map((name) => (
            <TabsTrigger key={name} value={name}>
              {TAB_LABELS[name]}
            </TabsTrigger>
          ))}
          <TabsTrigger value="global">Global Exclusions</TabsTrigger>
        </TabsList>

        {TEMPLATE_NAMES.map((name) => (
          <TabsContent key={name} value={name}>
            {loading && activeTab === name ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error && activeTab === name ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <TierAccordion
                tiers={templateData[name] ?? []}
                templateName={name}
                onSaved={(updatedTiers) => {
                  setTemplateData(prev => ({ ...prev, [name]: updatedTiers }));
                  setSavedAt(Date.now());
                }}
              />
            )}
          </TabsContent>
        ))}

        <TabsContent value="global">
          <GlobalExclusionsTab onSaved={() => setSavedAt(Date.now())} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
