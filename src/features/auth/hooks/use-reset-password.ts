import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { useCheckinStore } from '@/features/checkin/store/checkin.store';

import { resetPassword } from '../api';
import { navigateToLogin } from '../navigation';
import { useAuthStore } from '../store';
import type { ResetPasswordRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseResetPasswordResult {
  submit: (body: ResetPasswordRequest) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Submits a password-reset request using the token from the deep-link email.
 *
 * A successful reset revokes every backend session, so local auth/cache is
 * cleared immediately before redirecting to login.
 */
export function useResetPassword(): UseResetPasswordResult {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: ResetPasswordRequest) => resetPassword(body),
    onSuccess: async () => {
      useCheckinStore.getState().resetContext();
      await useAuthStore.getState().clearAuth();
      queryClient.clear();
      showToast(
        'Đặt lại mật khẩu thành công. Tài khoản đã sẵn sàng đăng nhập lại.',
        'success',
      );
      navigateToLogin();
    },
    onError: (error) => {
      showToast(parseAuthError(error), 'error');
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
