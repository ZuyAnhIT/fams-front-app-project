import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getPendingInvitations } from '../services/invitation.service';
import { useProfileStore } from '../store/profileStore';

export const invitationKeys = {
  pending: (tenantId: string) => ['profile', 'invitations', 'pending', tenantId] as const,
};

export function usePendingInvitations() {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const setPendingInvitations = useProfileStore((s) => s.setPendingInvitations);

  const query = useQuery({
    queryKey: invitationKeys.pending(tenantId ?? ''),
    queryFn: async () => {
      const response = await getPendingInvitations(tenantId as string);
      setPendingInvitations(response.content);
      return response.content;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
