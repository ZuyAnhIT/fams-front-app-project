import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { disable2FA, setup2FA, verify2FA } from '../api';
import { useAuthStore } from '../store';
import type { TwoFADisableRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Setup (generates QR code) ────────────────────────────────────────────────

/** Requests a new TOTP secret + QR code from the server */
export function use2FASetup() {
  const mutation = useMutation({
    mutationFn: () => setup2FA(),
  });

  return {
    /** Full mutation object – call mutate() to trigger, check data for QR info */
    ...mutation,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}

// ─── Verify (login 2FA step OR confirm setup) ─────────────────────────────────

export interface Use2FAVerifyResult {
  verify: (code: string) => void;
  isPending: boolean;
  error: string | null;
}

/**
 * Submits the 6-digit TOTP code.
 *
 * Used in two scenarios:
 * 1. Completing the login 2FA step (temp_token present in store).
 * 2. Confirming a new 2FA setup (temp_token absent; server just marks enabled).
 */
export function use2FAVerify(): Use2FAVerifyResult {
  const { tempToken, setTokens, setUser, set2FARequired } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (code: string) =>
      verify2FA({ code, temp_token: tempToken ?? undefined }),
    onSuccess: async (data) => {
      set2FARequired(false, null);
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      router.replace('/(tabs)/home');
    },
  });

  return {
    verify: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}

// ─── Disable ──────────────────────────────────────────────────────────────────

/** Disables TOTP for the currently authenticated user */
export function use2FADisable() {
  const mutation = useMutation({
    mutationFn: (body: TwoFADisableRequest) => disable2FA(body),
  });

  return {
    /** Full mutate fn – second arg accepts per-call callbacks */
    disable: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
