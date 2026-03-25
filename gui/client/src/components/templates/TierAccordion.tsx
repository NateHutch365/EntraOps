import type { TierBlock } from '../../../../shared/types/templates';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TierAccordionProps {
  tiers: TierBlock[];
}

const TIER_CLASS: Record<TierBlock['EAMTierLevelName'], string> = {
  ControlPlane: 'text-tier-control',
  ManagementPlane: 'text-tier-management',
  UserAccess: 'text-tier-useraccess',
};

export function TierAccordion({ tiers }: TierAccordionProps) {
  return (
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
                    <div className="flex flex-wrap gap-1">
                      {entry.RoleDefinitionActions.map((action, actionIndex) => (
                        <Badge
                          key={actionIndex}
                          variant="secondary"
                          className="font-mono text-xs mr-1 mb-1"
                        >
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
