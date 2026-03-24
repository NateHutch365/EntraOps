import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import type { ObjectsResponse } from '../../../shared/types/api';

export interface UseObjectsParams {
  q?: string;
  tier?: string[];
  rbac?: string[];
  type?: string[];
  pim?: string[];
  onprem?: string;    // 'true' | 'false' | '' (single value — server coerces to array)
  sort?: string;      // server PrivilegedObject field name
  order?: 'asc' | 'desc';
  page?: number;      // 1-based from URL; converted to 0-based before sending to server
  pageSize?: number;
}

interface UseObjectsResult {
  data: ObjectsResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useObjects(params: UseObjectsParams): UseObjectsResult {
  const [data, setData] = useState<ObjectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const sp = new URLSearchParams();

    if (params.q) sp.set('q', params.q);
    if (params.tier?.length) params.tier.forEach(v => sp.append('tier', v));
    if (params.rbac?.length) params.rbac.forEach(v => sp.append('rbac', v));
    if (params.type?.length) params.type.forEach(v => sp.append('type', v));
    if (params.pim?.length) params.pim.forEach(v => sp.append('pim', v));
    if (params.onprem) sp.set('onprem', params.onprem);

    // Sort: map from URL param names to server param names
    if (params.sort) sp.set('sortBy', params.sort);
    if (params.order) sp.set('sortDir', params.order);

    // Page: URL is 1-based; server expects 0-based
    const serverPage = Math.max(0, (params.page ?? 1) - 1);
    sp.set('page', String(serverPage));
    if (params.pageSize) sp.set('pageSize', String(params.pageSize));

    fetchApi<ObjectsResponse>(`/api/objects?${sp.toString()}`)
      .then(d => {
        if (!cancelled) {
          // Normalize server's 0-based page back to 1-based for consumers
          setData({ ...d, page: d.page + 1 });
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
  }, [
    params.q,
    params.sort,
    params.order,
    params.page,
    params.pageSize,
    params.onprem,
    // Stable array deps
    JSON.stringify(params.tier),
    JSON.stringify(params.rbac),
    JSON.stringify(params.type),
    JSON.stringify(params.pim),
  ]);

  return { data, isLoading, error };
}
