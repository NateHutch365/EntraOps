import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import type { CommitListResponse } from '../../../shared/types/api';

export interface UseCommitsParams {
  page: number;
  pageSize: number;
}

interface UseCommitsResult {
  data: CommitListResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useCommits({ page, pageSize }: UseCommitsParams): UseCommitsResult {
  const [data, setData] = useState<CommitListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('pageSize', String(pageSize));

    fetchApi<CommitListResponse>(`/api/git/commits?${sp.toString()}`)
      .then(d => {
        if (!cancelled) {
          setData(d);
          setIsLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [page, pageSize]);

  return { data, isLoading, error };
}
