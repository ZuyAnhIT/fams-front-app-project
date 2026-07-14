import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getCheckinHistory } from '../services/checkin.service';
import type { CheckinHistoryParams } from '../types/checkin.type';
import { checkinKeys } from './use-checkin';

/** Lịch sử chấm công của nhân viên hiện tại. */
export function useCheckinHistory(params: CheckinHistoryParams = {}) {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: checkinKeys.history(tenantId ?? '', params),
    queryFn: () => getCheckinHistory(tenantId!, params),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });

  return {
    records: query.data?.content ?? [],
    page: query.data?.page ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    totalElements: query.data?.totalElements ?? 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
