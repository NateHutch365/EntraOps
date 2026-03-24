import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TIER_STYLES = {
  ControlPlane: 'text-tier-control border-tier-control',
  ManagementPlane: 'text-tier-management border-tier-management',
  UserAccess: 'text-tier-user border-tier-user',
} as const;

interface KPICardProps {
  tier: keyof typeof TIER_STYLES;
  count: number;
  permanentCount: number;
  eligibleCount: number;
}

export function KPICard({ tier, count, permanentCount, eligibleCount }: KPICardProps) {
  const total = permanentCount + eligibleCount;
  const tierColorText = TIER_STYLES[tier].split(' ')[0];

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{tier}</CardTitle>
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', TIER_STYLES[tier])}
          >
            {tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* KPI count — display size 28px per UI-SPEC.md */}
        <div className={cn('text-[28px] font-semibold leading-none mb-3', tierColorText)}>
          {count.toLocaleString()}
        </div>
        {/* PIM mini-stat — 12px per UI-SPEC.md */}
        {total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Permanent</span>
              <span className="font-medium text-foreground">{permanentCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Eligible</span>
              <span className="font-medium text-foreground">{eligibleCount}</span>
            </div>
            {/* 4px accent bar */}
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-fluent-accent rounded-full"
                style={{ width: total > 0 ? `${(permanentCount / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
