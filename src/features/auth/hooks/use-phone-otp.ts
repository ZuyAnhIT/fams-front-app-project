import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { verifyPhoneOTP } from '../api';
import { navigateAfterAuth, resolveAuthenticatedSession } from '../session';
import { useAuthStore } from '../store';
import type { VerifyOTPRequest } from '../types';
import {
  getLockedUntil,
  isAccountLockedError,
  parseAuthError,
} from '../utils';

// ─── Verify OTP ──────────────────────────────────────────────────────────────
// Sending the SMS code itself is handled by useFirebasePhoneAuth (Firebase
// Client SDK, not a backend call) — this hook only covers the step where the
// resulting Firebase ID token is exchanged for FAMS JWTs.

export interface UseVerifyOTPResult {
  verifyOTP: (body: VerifyOTPRequest) => void;
  clearError: () => void;
  isPending: boolean;
  error: string | null;
  isAccountLocked: boolean;
  lockedUntil: string | undefined;
}

/**
 * Verifies the OTP entered by the user.
 *
 * On success:
 * - If server requires 2FA → pushes to 2fa-verify screen.
 * - Otherwise → persists tokens and navigates to the main app.
 */
export function useVerifyOTP(): UseVerifyOTPResult {
  const { setTokens, setUser, set2FARequired } = useAuthStore();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (body: VerifyOTPRequest) => verifyPhoneOTP(body),
    onSuccess: async (data) => {
      if (data.requires_2fa && data.temp_token) {
        set2FARequired(true, data.temp_token);
        showToast('Vui lòng xác thực mã 2 lớp', 'info');
        router.push('/(auth)/2fa-verify' as never);
        return;
      }
      await setTokens(data.access_token, data.refresh_token);
      const session = await resolveAuthenticatedSession(data.user, data.active_tenant_id);
      setUser(session.user);
      showToast('Đăng nhập thành công', 'success');
      navigateAfterAuth(session);
    },
    onError: (error) => {
      showToast(parseAuthError(error), 'error');
    },
  });

  const isAccountLocked =
    mutation.isError && isAccountLockedError(mutation.error);

  return {
    verifyOTP: mutation.mutate,
    clearError: mutation.reset,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    isAccountLocked,
    lockedUntil: isAccountLocked
      ? getLockedUntil(mutation.error)
      : undefined,
  };
}
