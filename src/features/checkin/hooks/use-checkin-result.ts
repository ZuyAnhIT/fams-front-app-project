import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { useAuthStore } from '@/features/auth/store';

import { getCheckinResult } from '../services/checkin.service';
import { checkinKeys } from './use-checkin';

/** US6: kết quả valid/invalid/pending_review + message + work_minutes của 1 check-in/out. */
export function useCheckinResult(
  checkinId: string | undefined,
) {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const pollingStartedAt = useRef(Date.now());

  const query = useQuery({
    queryKey: checkinKeys.result(tenantId ?? '', checkinId ?? ''),
    queryFn: () => getCheckinResult(tenantId!, checkinId!),
    enabled: !!tenantId && !!checkinId,
    refetchInterval: (currentQuery) => {
      const result = currentQuery.state.data;
      if (!result || Date.now() - pollingStartedAt.current >= 30_000) {
        return false;
      }
      const expectsFace =
        result.effectiveCheckinPolicy === 'gps_face' ||
        result.effectiveCheckinPolicy === 'gps_face_liveness';
      if (!expectsFace) return false;
      const checkinPending = result.faceVerified === null;
      const checkoutPending =
        result.checkOutAt !== null && result.checkoutFaceVerified === null;
      return checkinPending || checkoutPending ? 3_000 : false;
    },
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
