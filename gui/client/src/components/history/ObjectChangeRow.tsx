import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ObjectChange, RoleAssignmentDelta } from '../../../../shared/types/api';

interface ObjectChangeRowProps {
  change: ObjectChange;
}

function RoleDeltaRow({ delta }: { delta: RoleAssignmentDelta }) {
  const isAdded = delta.action === 'added';
  return (
    <div className={cn('flex items-center gap-2 pl-4 py-0.5 text-xs', isAdded ? 'text-green-700' : 'text-red-700')}>
      <span className="font-mono">{isAdded ? '+' : '−'}</span>
      <span>{delta.roleDefinitionName}</span>
      <Badge variant="outline" className="text-[10px] px-1 py-0">{delta.tier}</Badge>
    </div>
  );
}

export function ObjectChangeRow({ change }: ObjectChangeRowProps) {
  const rowBg =
    change.changeType === 'added'
      ? 'bg-green-950/10'
      : change.changeType === 'removed'
        ? 'bg-red-950/10'
        : 'bg-amber-950/10';

  return (
    <div className={cn('rounded px-3 py-2 mb-1', rowBg)}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-sm">{change.objectDisplayName}</span>
          <span className="block text-xs font-mono text-muted-foreground">{change.objectId}</span>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">{change.objectType}</Badge>
      </div>

      {change.changeType === 'tierChanged' && change.previousTier && change.currentTier && (
        <div className="flex items-center gap-1 mt-1">
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0">
            {change.previousTier} → {change.currentTier}
          </Badge>
        </div>
      )}

      {change.roleAssignmentDelta && change.roleAssignmentDelta.length > 0 && (
        <div className="mt-1">
          {change.roleAssignmentDelta.map((delta, i) => (
            <RoleDeltaRow key={i} delta={delta} />
          ))}
        </div>
      )}
    </div>
  );
}
