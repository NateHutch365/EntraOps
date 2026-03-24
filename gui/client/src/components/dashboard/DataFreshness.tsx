import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface DataFreshnessProps {
  freshness: string | null;
}

export function DataFreshness({ freshness }: DataFreshnessProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Clock size={14} />
          Data Freshness
        </CardTitle>
      </CardHeader>
      <CardContent>
        {freshness ? (
          <p className="text-sm text-foreground">
            Last updated:{' '}
            <span className="font-medium">{new Date(freshness).toLocaleString()}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No data files detected</p>
        )}
      </CardContent>
    </Card>
  );
}
