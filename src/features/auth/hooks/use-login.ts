import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { loginWithEmail, getMyProfile } from '../api';
import { useAuthStore } from '../store';
import type { LoginRequest } from '../types';
import { getLockedUntil, isAccountLockedError, parseAuthError } from '../utils';

export interface UseLoginResult {
  login: (credentials: LoginRequest) => void;
  isPending: boolean;
  error: string | null;
  lockedUntil: string | undefined;
}

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
      const user = data.user ?? (await getMyProfile());
      setUser(user);
      router.replace('/(tabs)/home');
    },
  });

  const lockedUntil =
    mutation.isError && isAccountLockedError(mutation.error)
      ? getLockedUntil(mutation.error)
      : undefined;

  return {
    login: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    lockedUntil,
  };
}
