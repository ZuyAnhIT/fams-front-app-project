import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getMyTenant, getTenant } from '../api';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const tenantKeys = {
  all: ['tenants'] as const,
  detail: (id: string) => ['tenants', id] as const,
  me: () => ['tenants', 'me'] as const,
  settings: (id: string) => ['tenants', id, 'settings'] as const,
  subscription: (id: string) => ['tenants', id, 'subscription'] as const,
  list: (params?: Record<string, unknown>) => ['tenants', 'list', params] as const,
};

// ─── useMyTenant ──────────────────────────────────────────────────────────────

/**
 * Fetches the tenant that belongs to the currently authenticated user.
 * Automatically skips the query when the user is not authenticated.
 */
export function useMyTenant() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: tenantKeys.me(),
    queryFn: getMyTenant,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes – tenant data changes infrequently
  });

  return {
    tenant: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useTenant ────────────────────────────────────────────────────────────────

/**
 * Fetches a specific tenant by ID.
 * Used by Platform Admins or when navigating to a tenant detail view.
 */
export function useTenant(id: string | undefined) {
  const query = useQuery({
    queryKey: tenantKeys.detail(id ?? ''),
    queryFn: () => getTenant(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    tenant: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
