import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/features/auth/store';

import { getSites } from '../services/site.service';
import type { Site, SiteListParams } from '../types/Site';

export const siteKeys = {
  all: ['sites'] as const,
  lists: () => [...siteKeys.all, 'list'] as const,
  list: (tenantId: string, params: SiteListParams) =>
    [...siteKeys.lists(), tenantId, params] as const,
  details: () => [...siteKeys.all, 'detail'] as const,
  detail: (tenantId: string, siteId: string) =>
    [...siteKeys.details(), tenantId, siteId] as const,
  assignments: (tenantId: string, siteId: string) =>
    [...siteKeys.all, 'assignments', tenantId, siteId] as const,
};

export interface UseSiteListResult {
  sites: Site[];
  page: number;
  totalPages: number;
  totalElements: number;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  isForbidden: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Danh sách công trình. Quyền `sites:list` được enforce ở backend
 * (TENANT_ADMIN, HR_MANAGER, SITE_SUPERVISOR đều có quyền này theo seed data
 * thật — không có khái niệm "chỉ xem site được assign" ở backend hiện tại).
 * Profile pre-gates the navigation using permissions returned by `/roles/me`
 * for better UX. This hook still treats backend 403 as authoritative because
 * permissions can change after the menu was rendered or the tenant can switch.
 */
export function useSiteList(params: SiteListParams = {}): UseSiteListResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: siteKeys.list(tenantId ?? '', params),
    queryFn: () => getSites(tenantId!, params),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  const isForbidden = isAxiosError(query.error) && query.error.response?.status === 403;

  return {
    sites: query.data?.content ?? [],
    page: query.data?.page ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    totalElements: query.data?.totalElements ?? 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    isForbidden,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
