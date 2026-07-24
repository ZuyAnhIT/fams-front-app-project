import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { loginWithPassword } from '../api';
import { navigateAfterAuth, resolveAuthenticatedSession } from '../session';
import { useAuthStore } from '../store';
import type { LoginRequest } from '../types';
import {
  getAuthErrorCode,
  getLockedUntil,
  isAccountLockedError,
  parseAuthError,
} from '../utils';

export interface UseLoginResult {
  login: (credentials: LoginRequest) => void;
  clearError: () => void;
  isPending: boolean;
  error: string | null;
  isAccountLocked: boolean;
  lockedUntil: string | undefined;
  emailVerificationRequired: boolean;
}

export function useLogin(): UseLoginResult {
  const { setTokens, setUser, set2FARequired } = useAuthStore();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (credentials: LoginRequest) => loginWithPassword(credentials),
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

  const isAccountLocked =
    mutation.isError && isAccountLockedError(mutation.error);
  const lockedUntil =
    isAccountLocked
      ? getLockedUntil(mutation.error)
      : undefined;

  return {
    login: mutation.mutate,
    clearError: mutation.reset,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    isAccountLocked,
    lockedUntil,
    emailVerificationRequired:
      mutation.isError && getAuthErrorCode(mutation.error) === 'EMAIL_NOT_VERIFIED',
  };
}
