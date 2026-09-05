import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getOpenCheckinSession } from '../services/checkin.service';
import { checkinKeys } from './use-checkin';

/** Canonical backend-backed open-session state shared by Home and Check-in screens. */
export function useOpenCheckin() {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  return useQuery({
    queryKey: checkinKeys.openSession(tenantId ?? ''),
    queryFn: () => getOpenCheckinSession(tenantId!),
    enabled: !!tenantId,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
  });
}
