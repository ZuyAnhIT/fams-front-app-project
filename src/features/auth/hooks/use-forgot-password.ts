import { useMutation } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';

import { forgotPassword } from '../api';
import type { ForgotPasswordRequest } from '../types';
import { parseAuthError } from '../utils';

export interface UseForgotPasswordResult {
  submit: (body: ForgotPasswordRequest) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Skeleton – Forgot Password flow (Sprint 2).
 *
 * Sends a password-reset link to the user's email.
 * Full OTP verification + new-password screen is out of scope for Sprint 1.
 */
export function useForgotPassword(): UseForgotPasswordResult {
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (body: ForgotPasswordRequest) => forgotPassword(body),
    onSuccess: () => {
      showToast('Đã gửi email đặt lại mật khẩu', 'success');
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
