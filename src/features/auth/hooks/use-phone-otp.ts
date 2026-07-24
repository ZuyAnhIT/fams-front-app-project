import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { verifyPhoneOTP } from '../services/auth.service';
import { navigateAfterAuth, resolveAuthenticatedSession } from '../utils/session';
import { useAuthStore } from '../store/auth.store';
import type { VerifyOTPRequest } from '../types/Auth';
import { parseAuthError } from '../utils/auth.utils';

// ─── Verify OTP ──────────────────────────────────────────────────────────────
// Sending the SMS code itself is handled by useFirebasePhoneAuth (Firebase
// Client SDK, not a backend call) — this hook only covers the step where the
// resulting Firebase ID token is exchanged for FAMS JWTs.

export interface UseVerifyOTPResult {
  verifyOTP: (body: VerifyOTPRequest) => void;
  isPending: boolean;
  error: string | null;
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
      const session = await resolveAuthenticatedSession(data.user);
      setUser(session.user);
      showToast('Đăng nhập thành công', 'success');
      navigateAfterAuth(session);
    },
    onError: (error) => {
      showToast(parseAuthError(error), 'error');
    },
  });

  return {
    verifyOTP: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
