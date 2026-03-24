import { Link } from 'react-router';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { RoleAssignmentRow } from './RoleAssignmentRow';
import type { PrivilegedObject } from '../../../../shared/types/eam';
import { cn } from '@/lib/utils';

const TIER_BADGE_CLASS: Record<string, string> = {
  ControlPlane: 'border-tier-control text-tier-control',
  ManagementPlane: 'border-tier-management text-tier-management',
  UserAccess: 'border-tier-user text-tier-user',
  Unclassified: 'border-tier-unclassified text-tier-unclassified',
};

interface ObjectDetailPanelProps {
  object: PrivilegedObject | null;
  onClose: () => void;
}

export function ObjectDetailPanel({ object, onClose }: ObjectDetailPanelProps) {
  const roles = object?.RoleAssignments ?? [];

  return (
    <Sheet open={!!object} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[480px] sm:max-w-[480px] flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 gap-1">
          {object && (
            <>
              {/* Identity card — UI-SPEC.md: DisplayName 20px/600, UPN 14px muted */}
              <SheetTitle className="text-[20px] font-semibold leading-tight">
                {object.ObjectDisplayName}
              </SheetTitle>
              {object.ObjectUserPrincipalName && (
                <p className="text-sm text-muted-foreground truncate">
                  {object.ObjectUserPrincipalName}
                </p>
              )}
              {/* Badge row: ObjectType + Tier + OnPremSync */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Badge variant="outline" className="text-xs font-normal">
                  {object.ObjectType}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', TIER_BADGE_CLASS[object.ObjectAdminTierLevelName] ?? '')}
                >
                  {object.ObjectAdminTierLevelName}
                </Badge>
                {object.OnPremSynchronized !== null && object.OnPremSynchronized !== undefined && (
                  <Badge
                    variant={object.OnPremSynchronized ? 'outline' : 'secondary'}
                    className="text-xs"
                  >
                    {object.OnPremSynchronized ? 'On-Prem' : 'Cloud Only'}
                  </Badge>
                )}
              </div>
            </>
          )}
        </SheetHeader>

        <Separator />

        {/* Role assignment list — ScrollArea allows long lists without resizing the Sheet */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-4">
            {object && (
              <>
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No role assignments found</p>
                ) : (
                  /* Group under the object's RBAC system heading */
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {object.RoleSystem}
                    </p>
                    <div className="space-y-0.5">
                      {roles.map((role, i) => (
                        <RoleAssignmentRow key={i} role={role} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer: "Open full page →" link (CONTEXT.md decision) */}
        <SheetFooter className="px-6 py-4">
          {object && (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link
                to={`/objects/${encodeURIComponent(object.ObjectId)}`}
                onClick={onClose}
              >
                Open full page
                <ExternalLink size={14} className="ml-1.5" />
              </Link>
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
