import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

interface UseExclusionsResult {
  exclusions: Set<string>;
  isLoading: boolean;
  invalidate: () => void;
}

export function useExclusions(): UseExclusionsResult {
  const [exclusions, setExclusions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const invalidate = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchApi<{ exclusions: string[] }>('/api/templates/global')
      .then((res) => {
        if (!cancelled) {
          setExclusions(new Set(res.exclusions));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { exclusions, isLoading, invalidate };
}
