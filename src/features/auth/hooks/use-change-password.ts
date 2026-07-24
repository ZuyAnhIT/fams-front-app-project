import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';
import { useCheckinStore } from '@/features/checkin/store/checkin.store';

import { changePassword } from '../api';
import { useAuthStore } from '../store';
import type { ChangePasswordRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseChangePasswordResult {
  submit: (body: ChangePasswordRequest) => void;
  isPending: boolean;
  error: string | null;
  /** Resets mutation state so the form can be used again */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Allows an authenticated user to change their current password.
 *
 * Sends current_password + new_password to the server.
 * The confirm_password field is validated client-side only (Zod) and
 * is NOT included in the API request body.
 */
export function useChangePassword(): UseChangePasswordResult {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: (body: ChangePasswordRequest) => changePassword(body),
    onSuccess: async () => {
      useCheckinStore.getState().resetContext();
      await useAuthStore.getState().clearAuth();
      queryClient.clear();
      showToast('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.', 'success');
      router.replace('/(auth)/login');
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    reset: mutation.reset,
  };
}
