import { cn } from '@/lib/utils';
import { ObjectChangeRow } from './ObjectChangeRow';
import type { TierSectionChanges } from '../../../../shared/types/api';

interface TierSectionProps {
  section: TierSectionChanges;
}

const TIER_STYLES: Record<TierSectionChanges['tier'], string> = {
  ControlPlane: 'border-l-4 border-tier-control bg-tier-control/5',
  ManagementPlane: 'border-l-2 border-tier-management',
  UserAccess: 'border-l-2 border-tier-user',
};

const TIER_LABEL_STYLES: Record<TierSectionChanges['tier'], string> = {
  ControlPlane: 'text-tier-control',
  ManagementPlane: 'text-tier-management',
  UserAccess: 'text-tier-user',
};

export function TierSection({ section }: TierSectionProps) {
  const hasAdded = section.added.length > 0;
  const hasRemoved = section.removed.length > 0;
  const hasTierChanged = section.tierChanged.length > 0;
  const isEmpty = !hasAdded && !hasRemoved && !hasTierChanged;

  return (
    <div className={cn('pl-3 pr-2 py-2 rounded-r mb-2', TIER_STYLES[section.tier])}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide mb-2', TIER_LABEL_STYLES[section.tier])}>
        {section.tier}
      </p>

      {isEmpty ? (
        <p className="text-xs text-muted-foreground">No {section.tier} changes</p>
      ) : (
        <>
          {hasAdded && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Added</p>
              {section.added.map((change, i) => (
                <ObjectChangeRow key={i} change={change} />
              ))}
            </div>
          )}
          {hasRemoved && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Removed</p>
              {section.removed.map((change, i) => (
                <ObjectChangeRow key={i} change={change} />
              ))}
            </div>
          )}
          {hasTierChanged && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Tier Changed</p>
              {section.tierChanged.map((change, i) => (
                <ObjectChangeRow key={i} change={change} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
