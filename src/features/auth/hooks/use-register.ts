import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { registerUser } from '../services/auth.service';
import { navigateAfterAuth, resolveAuthenticatedSession } from '../utils/session';
import { useAuthStore } from '../store/auth.store';
import type { RegisterRequest } from '../types/Auth';
import { parseAuthError } from '../utils/auth.utils';

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
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (body: RegisterRequest) => registerUser(body),
    onSuccess: async (data) => {
      if (data.requires_2fa && data.temp_token) {
        set2FARequired(true, data.temp_token);
        showToast('Vui lòng xác thực mã 2 lớp', 'info');
        router.push('/(auth)/2fa-verify' as never);
        return;
      }
      if (data.access_token) {
        await setTokens(data.access_token, data.refresh_token);
        const session = await resolveAuthenticatedSession(data.user);
        setUser(session.user);
        showToast('Đăng ký thành công', 'success');
        navigateAfterAuth(session);
        return;
      }
      // Server may require email verification before login
      showToast('Đăng ký thành công — vui lòng đăng nhập', 'success');
      router.replace('/(auth)/login');
    },
  });

  return {
    register: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
