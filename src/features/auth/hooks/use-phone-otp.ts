import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { sendPhoneOTP, verifyPhoneOTP } from '../api';
import { useAuthStore } from '../store';
import type { SendOTPRequest, VerifyOTPRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Send OTP ────────────────────────────────────────────────────────────────

/** Triggers an SMS OTP to the supplied phone number */
export function useSendOTP() {
  const mutation = useMutation({
    mutationFn: (body: SendOTPRequest) => sendPhoneOTP(body),
  });

  return {
    /** Accepts an optional second arg for per-call callbacks (TanStack Query v5) */
    sendOTP: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

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

  const mutation = useMutation({
    mutationFn: (body: VerifyOTPRequest) => verifyPhoneOTP(body),
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
    verifyOTP: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
