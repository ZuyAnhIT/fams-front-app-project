import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getTenantList } from '../api';
import type { TenantListParams } from '../types';
import { tenantKeys } from './use-tenant';

/**
 * Lists all tenants – accessible only to Platform Admins.
 * Automatically disabled when the current user's role is not 'admin'.
 */
export function useTenantList(params?: TenantListParams) {
  const user = useAuthStore((s) => s.user);
  const isPlatformAdmin = user?.role === 'admin';

  const query = useQuery({
    queryKey: tenantKeys.list(params as Record<string, unknown>),
    queryFn: () => getTenantList(params),
    enabled: isPlatformAdmin,
    staleTime: 2 * 60 * 1000,
  });

  return {
    tenants: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
