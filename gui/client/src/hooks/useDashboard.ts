import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import type { DashboardResponse } from '../../../shared/types/api';

interface UseDashboardResult {
  data: DashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchApi<DashboardResponse>('/api/dashboard')
      .then(d => {
        if (!cancelled) {
          setData(d);
          setIsLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trigger]);

  return { data, isLoading, error, refetch: () => setTrigger(t => t + 1) };
}
