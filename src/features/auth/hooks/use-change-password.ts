import { useMutation } from '@tanstack/react-query';

import { changePassword } from '../api';
import type { ChangePasswordRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseChangePasswordResult {
  submit: (body: ChangePasswordRequest) => void;
  isPending: boolean;
  isSuccess: boolean;
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
  const mutation = useMutation({
    mutationFn: (body: ChangePasswordRequest) => changePassword(body),
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    reset: mutation.reset,
  };
}
