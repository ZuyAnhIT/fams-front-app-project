import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';

import {
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
} from '../services/invitation.service';
import { useProfileStore } from '../store/profileStore';
import { parseProfileError } from '../utils/profile.utils';

export const invitationKeys = {
  pending: () => ['profile', 'invitations', 'pending'] as const,
};

export function usePendingInvitations() {
  const setPendingInvitations = useProfileStore((s) => s.setPendingInvitations);

  const query = useQuery({
    queryKey: invitationKeys.pending(),
    queryFn: async () => {
      const list = await getPendingInvitations();
      setPendingInvitations(list);
      return list;
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useInvitationActions() {
  const queryClient = useQueryClient();
  const removeInvitation = useProfileStore((s) => s.removeInvitation);
  const { showToast } = useToast();

  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: (data) => {
      removeInvitation(data.invitation.id);
      queryClient.invalidateQueries({ queryKey: invitationKeys.pending() });
      showToast(data.message, 'success');
    },
    onError: (error) => showToast(parseProfileError(error), 'error'),
  });

  const declineMutation = useMutation({
    mutationFn: declineInvitation,
    onSuccess: (invitation) => {
      removeInvitation(invitation.id);
      queryClient.invalidateQueries({ queryKey: invitationKeys.pending() });
      showToast('Đã từ chối lời mời', 'info');
    },
    onError: (error) => showToast(parseProfileError(error), 'error'),
  });

  return {
    accept: acceptMutation.mutate,
    decline: declineMutation.mutate,
    isAccepting: acceptMutation.isPending,
    isDeclining: declineMutation.isPending,
  };
}
