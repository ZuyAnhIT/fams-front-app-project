import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';

import { getAuthSessions, logoutOtherDevices, revokeAuthSession } from '../api';
import { parseAuthError } from '../utils';

export const authSessionKeys = { all: () => ['auth', 'sessions'] as const };

export function useAuthSessions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const query = useQuery({ queryKey: authSessionKeys.all(), queryFn: getAuthSessions });

  const revoke = useMutation({
    mutationFn: revokeAuthSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authSessionKeys.all() });
      showToast('Đã thu hồi phiên đăng nhập', 'success');
    },
    onError: (error) => showToast(parseAuthError(error), 'error'),
  });
  const logoutOthers = useMutation({
    mutationFn: logoutOtherDevices,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authSessionKeys.all() });
      showToast('Đã đăng xuất các thiết bị khác', 'success');
    },
    onError: (error) => showToast(parseAuthError(error), 'error'),
  });

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error ? parseAuthError(query.error) : null,
    refetch: query.refetch,
    revoke: revoke.mutate,
    revokePendingId: revoke.isPending ? revoke.variables : null,
    logoutOthers: logoutOthers.mutate,
    isLoggingOutOthers: logoutOthers.isPending,
  };
}
