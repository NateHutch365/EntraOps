import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { fetchApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { RoleAssignmentRow } from '@/components/objects/RoleAssignmentRow';
import type { PrivilegedObject } from '../../../shared/types/eam';
import { cn } from '@/lib/utils';

const TIER_BADGE_CLASS: Record<string, string> = {
  ControlPlane: 'border-tier-control text-tier-control',
  ManagementPlane: 'border-tier-management text-tier-management',
  UserAccess: 'border-tier-user text-tier-user',
  Unclassified: 'border-tier-unclassified text-tier-unclassified',
};

export function ObjectDetail() {
  const { objectId } = useParams<{ objectId: string }>();
  const [object, setObject] = useState<PrivilegedObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!objectId) return;
    setIsLoading(true);
    setError(null);

    fetchApi<PrivilegedObject>(`/api/objects/${encodeURIComponent(objectId)}`)
      .then(d => { setObject(d); setIsLoading(false); })
      .catch(e => { setError(e.message); setIsLoading(false); });
  }, [objectId]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (error || !object) {
    return (
      <div className="p-6 max-w-3xl">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertCircle size={20} />
            <p className="text-sm">{error ?? 'Object not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roles = object.RoleAssignments ?? [];

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {/* Back breadcrumb */}
      <Button variant="ghost" size="sm" asChild className="h-7 -ml-2 text-muted-foreground">
        <Link to="/objects">
          <ChevronLeft size={16} />
          Back to Objects
        </Link>
      </Button>

      {/* Identity card — same fields as Sheet panel (UI-SPEC.md) */}
      <div>
        <h1 className="text-[20px] font-semibold">{object.ObjectDisplayName}</h1>
        {object.ObjectUserPrincipalName && (
          <p className="text-sm text-muted-foreground">{object.ObjectUserPrincipalName}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap mt-2">
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
          <Badge variant="secondary" className="text-xs">{object.RoleSystem}</Badge>
        </div>
      </div>

      <Separator />

      {/* Role assignments grouped under RBAC system heading */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Role Assignments ({roles.length})</h2>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No role assignments found</p>
        ) : (
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
      </div>
    </div>
  );
}
