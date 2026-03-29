import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RoleAssignment } from '../../../../shared/types/eam';

const ACTIONS_TRUNCATE = 5;

interface RoleAssignmentRowProps {
  role: RoleAssignment;
}

export function RoleAssignmentRow({ role }: RoleAssignmentRowProps) {
  const [open, setOpen] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  const actions = role.RoleDefinitionActions ?? [];
  const truncatedActions = actions.slice(0, ACTIONS_TRUNCATE);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full py-2 text-left hover:bg-muted/50 rounded px-2 -mx-2 transition-colors">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{role.RoleDefinitionName}</p>
            {role.PIMAssignmentType && role.PIMAssignmentType !== 'NoAssignment' && (
              <p className="text-xs text-muted-foreground">{role.PIMAssignmentType}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {role.RoleAssignmentScopeName && (
              <Badge variant="outline" className="text-xs font-normal max-w-[120px] truncate">
                {role.RoleAssignmentScopeName}
              </Badge>
            )}
            {open ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="pl-2 pb-2">
          {actions.length > 0 ? (
            <div className="space-y-1 mt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Permissions ({actions.length})
              </p>
              <ul className="space-y-0.5">
                {(showAllActions ? actions : truncatedActions).map((action, i) => (
                  <li
                    key={i}
                    className="text-xs font-mono bg-muted/40 rounded px-1.5 py-0.5 break-all"
                  >
                    {action}
                  </li>
                ))}
              </ul>
              {actions.length > ACTIONS_TRUNCATE && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground px-0"
                  onClick={e => {
                    e.stopPropagation();
                    setShowAllActions(v => !v);
                  }}
                >
                  {showAllActions ? 'Show fewer' : `Show all ${actions.length} actions`}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No permission actions recorded</p>
          )}

          {role.RoleType && (
            <p className="text-xs text-muted-foreground mt-1">
              Type: <span className="text-foreground">{role.RoleType}</span>
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
