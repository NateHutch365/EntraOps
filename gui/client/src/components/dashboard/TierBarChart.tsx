import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RbacBreakdown } from '../../../../shared/types/api';

// RBAC segment colors from UI-SPEC.md stacked bar chart section
const RBAC_COLORS: Record<string, string> = {
  EntraID: 'oklch(0.52 0.22 261)',
  ResourceApps: 'oklch(0.62 0.18 31)',
  IdentityGovernance: 'oklch(0.68 0.14 145)',
  DeviceManagement: 'oklch(0.56 0.18 300)',
  Defender: 'oklch(0.60 0.20 14)',
};

const RBAC_SYSTEMS = [
  'EntraID',
  'ResourceApps',
  'IdentityGovernance',
  'DeviceManagement',
  'Defender',
] as const;

interface TierBarChartProps {
  data: RbacBreakdown[];
}

export function TierBarChart({ data }: TierBarChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">RBAC System Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">RBAC System Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {/* CRITICAL: Fixed pixel height — ResponsiveContainer height="100%" on auto-height parent = 0px chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {/* Horizontal bar chart: layout="vertical", tier names on Y axis */}
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="tier"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{ fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {RBAC_SYSTEMS.map(system => (
                <Bar
                  key={system}
                  dataKey={system}
                  stackId="rbac"
                  fill={RBAC_COLORS[system]}
                  name={system}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
