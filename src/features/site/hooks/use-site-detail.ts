import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store/auth.store';

import { getSiteDetail } from '../services/site.service';
import type { SiteDetailResponse } from '../types/Site';
import { siteKeys } from './use-site-list';

export interface UseSiteDetailResult {
  detail: SiteDetailResponse | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useSiteDetail(siteId: string): UseSiteDetailResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: siteKeys.detail(tenantId ?? '', siteId),
    queryFn: () => getSiteDetail(tenantId!, siteId),
    enabled: !!tenantId && !!siteId,
    staleTime: 60 * 1000,
  });

  return {
    detail: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
