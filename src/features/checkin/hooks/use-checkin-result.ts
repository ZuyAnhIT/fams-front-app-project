import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getCheckinResult } from '../services/checkin.service';
import { checkinKeys } from './use-checkin';

/** US6: kết quả valid/invalid/pending_review + message + work_minutes của 1 check-in/out. */
export function useCheckinResult(checkinId: string | undefined) {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: checkinKeys.result(tenantId ?? '', checkinId ?? ''),
    queryFn: () => getCheckinResult(tenantId!, checkinId!),
    enabled: !!tenantId && !!checkinId,
  });

  return {
    result: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
