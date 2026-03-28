import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import type { Override, OverridesResponse } from '../../../shared/types/api.js';

interface UseOverridesResult {
  data: Override[];
  isLoading: boolean;
  error: string | null;
  invalidate: () => void;
}

export function useOverrides(): UseOverridesResult {
  const [data, setData] = useState<Override[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchApi<OverridesResponse>('/api/overrides')
      .then((res) => {
        if (!cancelled) {
          setData(res.overrides);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(String(err));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const invalidate = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { data, isLoading, error, invalidate };
}
