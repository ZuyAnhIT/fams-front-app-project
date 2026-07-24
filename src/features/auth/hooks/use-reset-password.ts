import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { resetPassword } from '../services/auth.service';
import type { ResetPasswordRequest } from '../types/Auth';
import { parseAuthError } from '../utils/auth.utils';

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
 * After 2 seconds of showing the success state the user is redirected to login.
 */
export function useResetPassword(): UseResetPasswordResult {
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (body: ResetPasswordRequest) => resetPassword(body),
    onSuccess: () => {
      showToast('Đặt lại mật khẩu thành công', 'success');
      setTimeout(() => router.replace('/(auth)/login'), 2000);
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
