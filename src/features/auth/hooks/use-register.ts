import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { getMyProfile, registerUser } from '../api';
import { useAuthStore } from '../store';
import type { RegisterRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseRegisterResult {
  register: (data: RegisterRequest) => void;
  isPending: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Handles new account registration.
 *
 * On success:
 * - If server requires 2FA → stores temp_token and pushes to 2fa-verify screen.
 * - If server returns tokens (auto-login) → persists tokens and navigates to app.
 * - Otherwise (e.g. email verification required) → redirects to login.
 */
export function useRegister(): UseRegisterResult {
  const { setTokens, setUser, set2FARequired } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (body: RegisterRequest) => registerUser(body),
    onSuccess: async (data) => {
      if (data.requires_2fa && data.temp_token) {
        set2FARequired(true, data.temp_token);
        router.push('/(auth)/2fa-verify' as never);
        return;
      }
      if (data.access_token) {
        await setTokens(data.access_token, data.refresh_token);
        const user = data.user ?? (await getMyProfile());
        setUser(user);
        router.replace('/(tabs)/home');
        return;
      }
      // Server may require email verification before login
      router.replace('/(auth)/login');
    },
  });

  return {
    register: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
