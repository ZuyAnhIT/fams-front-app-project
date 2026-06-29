import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { logoutAllDevices, logoutSingleDevice } from '../api';
import { useAuthStore } from '../store';

interface UseLogoutResult {
  /** Logs out the current device only */
  logout: () => void;
  /** Logs out all devices (revokes all refresh tokens) */
  logoutAll: () => void;
  isPending: boolean;
}

/**
 * Provides logout actions for single-device and all-devices scenarios.
 *
 * Local auth state is always cleared regardless of whether the API call
 * succeeds, so the user is never stuck in an authenticated state.
 */
export function useLogout(): UseLogoutResult {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const resetAndRedirect = async (message: string) => {
    showToast(message, 'success');
    await clearAuth();
    queryClient.clear();
    router.replace('/(auth)/login');
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await logoutSingleDevice();
      } finally {
        await resetAndRedirect('Đã đăng xuất');
      }
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      try {
        await logoutAllDevices();
      } finally {
        await resetAndRedirect('Đã đăng xuất khỏi tất cả thiết bị');
      }
    },
  });

  return {
    logout: logoutMutation.mutate,
    logoutAll: logoutAllMutation.mutate,
    isPending: logoutMutation.isPending || logoutAllMutation.isPending,
  };
}
