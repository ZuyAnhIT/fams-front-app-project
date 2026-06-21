import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { loginWithEmail } from '../api';
import { useAuthStore } from '../store';
import type { LoginRequest } from '../types';
import { parseAuthError } from '../utils';

export interface UseLoginResult {
  login: (credentials: LoginRequest) => void;
  isPending: boolean;
  error: string | null;
}

/**
 * Handles email + password login.
 *
 * On success:
 * - If server requires 2FA → stores temp_token and pushes to 2fa-verify screen.
 * - Otherwise → persists tokens and navigates to the main app.
 */
export function useLogin(): UseLoginResult {
  const { setTokens, setUser, set2FARequired } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (credentials: LoginRequest) => loginWithEmail(credentials),
    onSuccess: async (data) => {
      if (data.requires_2fa && data.temp_token) {
        set2FARequired(true, data.temp_token);
        router.push('/(auth)/2fa-verify' as never);
        return;
      }
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      router.replace('/(tabs)/home');
    },
  });

  return {
    login: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
