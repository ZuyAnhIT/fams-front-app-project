import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { resetPassword } from '../api';
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
 * After 2 seconds of showing the success state the user is redirected to login.
 */
export function useResetPassword(): UseResetPasswordResult {
  const mutation = useMutation({
    mutationFn: (body: ResetPasswordRequest) => resetPassword(body),
    onSuccess: () => {
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
