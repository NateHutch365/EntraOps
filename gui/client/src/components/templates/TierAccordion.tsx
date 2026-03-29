import { useState } from 'react';
import { z } from 'zod';
import type { TierBlock, TemplateName } from '../../../../shared/types/templates';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChipEditor } from './ChipEditor';
import { DiffDialog } from './DiffDialog';

interface TierAccordionProps {
  tiers: TierBlock[];
  templateName: TemplateName;
  onSaved: (updatedTiers: TierBlock[]) => void;
}

const TIER_CLASS: Record<TierBlock['EAMTierLevelName'], string> = {
  ControlPlane: 'text-tier-control',
  ManagementPlane: 'text-tier-management',
  UserAccess: 'text-tier-useraccess',
};

const ActionsSchema = z.array(z.string());

export function TierAccordion({ tiers, templateName, onSaved }: TierAccordionProps) {
  const [dirtyActions, setDirtyActions] = useState<Record<string, string[]>>({});
  const [diffOpen, setDiffOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function getActions(tierIdx: number, entryIdx: number): string[] {
    const key = `${tierIdx}-${entryIdx}`;
    return dirtyActions[key] ?? tiers[tierIdx].TierLevelDefinition[entryIdx].RoleDefinitionActions;
  }

  function buildProposedTiers(tierIdx: number, entryIdx: number): TierBlock[] {
    const currentActions = getActions(tierIdx, entryIdx);
    return tiers.map((tier, tI) => ({
      ...tier,
      TierLevelDefinition: tier.TierLevelDefinition.map((entry, eI) =>
        tI === tierIdx && eI === entryIdx
          ? { ...entry, RoleDefinitionActions: currentActions }
          : entry
      ),
    }));
  }

  function handlePreview(tierIdx: number, entryIdx: number) {
    const key = `${tierIdx}-${entryIdx}`;
    if (!dirtyActions[key]) return;

    const currentActions = getActions(tierIdx, entryIdx);
    const result = ActionsSchema.safeParse(currentActions);
    if (!result.success) {
      setValidationErrors(prev => ({
        ...prev,
        [key]: result.error.issues[0]?.message ?? 'Validation error',
      }));
      return;
    }

    setDiffOpen(key);
  }

  return (
    <>
      <Accordion type="multiple" className="w-full">
        {tiers.map((tier, tierIndex) => (
          <AccordionItem key={tierIndex} value={`tier-${tierIndex}`}>
            <AccordionTrigger className="text-sm font-medium">
              <span className={cn('font-semibold', TIER_CLASS[tier.EAMTierLevelName])}>
                {tier.EAMTierLevelName}
              </span>
              <span className="ml-2 text-muted-foreground font-normal">
                ({tier.TierLevelDefinition.length} entries)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 pt-1">
                {tier.TierLevelDefinition.map((entry, entryIndex) => (
                  <Card key={entryIndex} className="mb-2">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                      <CardTitle className="text-sm">
                        {entry.Category} / {entry.Service}
                      </CardTitle>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {entry.RoleAssignmentScopeName.join(', ')}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ChipEditor
                        actions={getActions(tierIndex, entryIndex)}
                        onChange={(newActions) => {
                          const key = `${tierIndex}-${entryIndex}`;
                          setDirtyActions(prev => ({ ...prev, [key]: newActions }));
                          setValidationErrors(prev => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          });
                        }}
                      />
                      {validationErrors[`${tierIndex}-${entryIndex}`] && (
                        <p className="text-destructive text-xs mt-1">
                          {validationErrors[`${tierIndex}-${entryIndex}`]}
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        disabled={!dirtyActions[`${tierIndex}-${entryIndex}`]}
                        onClick={() => handlePreview(tierIndex, entryIndex)}
                      >
                        Preview Changes
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {diffOpen !== null && (() => {
        const [tIdx, eIdx] = diffOpen.split('-').map(Number);
        const proposedTiers = buildProposedTiers(tIdx, eIdx);
        return (
          <DiffDialog
            open={true}
            title={`Preview: ${templateName}.json`}
            before={JSON.stringify(tiers, null, 2)}
            after={JSON.stringify(proposedTiers, null, 2)}
            loading={saving}
            onCancel={() => setDiffOpen(null)}
            onConfirm={async () => {
              setSaving(true);
              try {
                const res = await fetch(`/api/templates/${templateName}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tiers: proposedTiers }),
                });
                if (!res.ok) {
                  let errMsg = `HTTP ${res.status}`;
                  try {
                    const err = await res.json() as { error?: unknown };
                    errMsg = JSON.stringify(err.error ?? err);
                  } catch {
                    // non-JSON error body — use status message
                  }
                  setValidationErrors(prev => ({ ...prev, [diffOpen]: errMsg }));
                  setDiffOpen(null);
                  return;
                }
                const key = diffOpen;
                setDirtyActions(prev => { const next = { ...prev }; delete next[key]; return next; });
                setDiffOpen(null);
                onSaved(proposedTiers);
              } finally {
                setSaving(false);
              }
            }}
          />
        );
      })()}
    </>
  );
}
