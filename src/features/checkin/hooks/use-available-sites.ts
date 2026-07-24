import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/features/auth/store/auth.store';

import { getAvailableSites } from '../services/checkin.service';
import { checkinKeys } from './use-checkin';

/** US1: site nhân viên được phép check-in hôm nay, theo assignment đang active. */
export function useAvailableSites() {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: checkinKeys.availableSites(tenantId ?? ''),
    queryFn: () => getAvailableSites(tenantId!),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });

  const isForbidden = isAxiosError(query.error) && query.error.response?.status === 403;

  return {
    sites: query.data ?? [],
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
