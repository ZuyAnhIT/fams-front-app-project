import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

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
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (credentials: LoginRequest) => loginWithEmail(credentials),
    onSuccess: async (data) => {
      if (data.requires_2fa && data.temp_token) {
        set2FARequired(true, data.temp_token);
        showToast('Vui lòng xác thực mã 2 lớp', 'info');
        router.push('/(auth)/2fa-verify' as never);
        return;
      }
      await setTokens(data.access_token, data.refresh_token);
      const user = data.user ?? (await getMyProfile());
      setUser(user);
      showToast('Đăng nhập thành công', 'success');
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
