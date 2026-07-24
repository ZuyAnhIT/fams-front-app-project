import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { loginWithEmail } from '../services/auth.service';
import { navigateAfterAuth, resolveAuthenticatedSession } from '../utils/session';
import { useAuthStore } from '../store/auth.store';
import type { LoginRequest } from '../types/Auth';
import { getLockedUntil, isAccountLockedError, parseAuthError } from '../utils/auth.utils';

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
      const session = await resolveAuthenticatedSession(data.user);
      setUser(session.user);
      showToast('Đăng nhập thành công', 'success');
      navigateAfterAuth(session);
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
