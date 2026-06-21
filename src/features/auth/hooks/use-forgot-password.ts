import { useMutation } from '@tanstack/react-query';

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
  const mutation = useMutation({
    mutationFn: (body: ForgotPasswordRequest) => forgotPassword(body),
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
