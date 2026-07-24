import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store/auth.store';

import { getPendingInvitations } from '../services/invitation.service';

export const invitationKeys = {
  pending: (tenantId: string) => ['profile', 'invitations', 'pending', tenantId] as const,
};

export function usePendingInvitations() {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: invitationKeys.pending(tenantId ?? ''),
    queryFn: async () => (await getPendingInvitations(tenantId as string)).content,
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
