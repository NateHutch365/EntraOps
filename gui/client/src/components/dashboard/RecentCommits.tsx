import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCommit } from 'lucide-react';
import type { GitCommit as GitCommitType } from '../../../../shared/types/api';

interface RecentCommitsProps {
  commits: GitCommitType[];
}

export function RecentCommits({ commits }: RecentCommitsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <GitCommit size={14} />
          Recent Changes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {commits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No commit history yet — changes to PrivilegedEAM/ will appear here once
            you've committed at least one run.
          </p>
        ) : (
          <ul className="space-y-2">
            {commits.map(c => (
              <li key={c.hash} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">
                  {c.hash}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate">{c.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.date).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
