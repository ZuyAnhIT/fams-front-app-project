import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { confirmTotpSetup, disable2FA, getMyProfile, setup2FA, verifyLoginTotp } from '../api';
import { profileKeys } from './use-profile';
import { useAuthStore } from '../store';
import type { TwoFAConfirmSetupRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Setup (generates QR code) ────────────────────────────────────────────────

export function use2FASetup() {
  const mutation = useMutation({
    mutationFn: () => setup2FA(),
  });

  return {
    ...mutation,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}

// ─── Confirm setup (after scanning QR) ────────────────────────────────────────

export function use2FAConfirmSetup() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: TwoFAConfirmSetupRequest) => confirmTotpSetup(body),
    onSuccess: async () => {
      const user = await getMyProfile(useAuthStore.getState().user);
      const updated = { ...user, is_2fa_enabled: true };
      setUser(updated);
      queryClient.setQueryData(profileKeys.me(), updated);
    },
  });

  return {
    confirm: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    reset: mutation.reset,
  };
}

// ─── Verify (login 2FA step) ──────────────────────────────────────────────────

export interface Use2FAVerifyResult {
  verify: (code: string) => void;
  isPending: boolean;
  error: string | null;
}

export function use2FAVerify(): Use2FAVerifyResult {
  const { tempToken, setTokens, setUser, set2FARequired } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (code: string) =>
      verifyLoginTotp({ code, temp_token: tempToken ?? undefined }),
    onSuccess: async (data) => {
      set2FARequired(false, null);
      await setTokens(data.access_token, data.refresh_token);
      const user = data.user ?? (await getMyProfile());
      setUser({ ...user, is_2fa_enabled: true });
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

export function use2FADisable() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => disable2FA(),
    onSuccess: async () => {
      const user = await getMyProfile(useAuthStore.getState().user);
      const updated = { ...user, is_2fa_enabled: false };
      setUser(updated);
      queryClient.setQueryData(profileKeys.me(), updated);
    },
  });

  return {
    disable: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
  };
}
