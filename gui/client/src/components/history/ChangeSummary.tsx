import { Separator } from '@/components/ui/separator';
import { TierSection } from './TierSection';
import type { TierSectionChanges } from '../../../../shared/types/api';

interface ChangeSummaryProps {
  sections: TierSectionChanges[];
}

const TIER_ORDER: TierSectionChanges['tier'][] = ['ControlPlane', 'ManagementPlane', 'UserAccess'];

export function ChangeSummary({ sections }: ChangeSummaryProps) {
  const ordered = TIER_ORDER.map(
    tier => sections.find(s => s.tier === tier) ?? { tier, added: [], removed: [], tierChanged: [] }
  );

  return (
    <div className="space-y-1">
      {ordered.map((section, i) => (
        <div key={section.tier}>
          <TierSection section={section} />
          {i < ordered.length - 1 && <Separator className="my-1" />}
        </div>
      ))}
    </div>
  );
}
