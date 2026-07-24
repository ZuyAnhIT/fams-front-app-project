import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/ui/toast';
import { GOOGLE_WEB_CLIENT_ID } from '@/config/google';

import { getMyProfile, linkGoogleAccount, unlinkGoogleAccount } from '../api';
import {
  getGoogleIdTokenNative,
  GoogleSignInCancelledError,
  getGoogleOAuthSetupHint,
  isExpoGo,
  isNativeGoogleSignInAvailable,
} from '../google-sign-in-service';
import { requestGoogleIdTokenWeb } from '../google-identity-service';
import { useAuthStore } from '../store';
import { parseAuthError } from '../utils';
import { profileKeys } from './use-profile';

export function useGoogleAccountLink() {
  const [sessionError, setSessionError] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const syncProfile = useCallback(async () => {
    const profile = await getMyProfile(currentUser);
    setUser(profile);
    queryClient.setQueryData(profileKeys.me(), profile);
  }, [currentUser, queryClient, setUser]);

  const linkMutation = useMutation({
    mutationFn: linkGoogleAccount,
    onSuccess: async () => {
      await syncProfile();
      showToast('Đã liên kết tài khoản Google', 'success');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkGoogleAccount,
    onSuccess: async () => {
      await syncProfile();
      showToast('Đã gỡ liên kết tài khoản Google', 'success');
    },
  });

  const exchangeIdToken = useCallback((idToken: string) => {
    setSessionError(null);
    linkMutation.mutate(idToken);
  }, [linkMutation]);

  const link = async () => {
    setSessionError(null);
    if (!GOOGLE_WEB_CLIENT_ID) {
      setSessionError('Chưa cấu hình EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
      return;
    }
    if (Platform.OS === 'web') {
      try {
        exchangeIdToken(await requestGoogleIdTokenWeb());
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : 'Liên kết Google thất bại');
      }
      return;
    }
    if (isNativeGoogleSignInAvailable()) {
      try {
        exchangeIdToken(await getGoogleIdTokenNative());
      } catch (error) {
        if (error instanceof GoogleSignInCancelledError) return;
        setSessionError(error instanceof Error ? error.message : 'Liên kết Google thất bại');
      }
      return;
    }
    if (isExpoGo()) {
      setSessionError(getGoogleOAuthSetupHint());
      return;
    }
    setSessionError('Liên kết Google native chưa sẵn sàng.');
  };

  return {
    link: () => void link(),
    unlink: unlinkMutation.mutate,
    isReady: !!GOOGLE_WEB_CLIENT_ID,
    isPending: linkMutation.isPending || unlinkMutation.isPending,
    error:
      sessionError ??
      (linkMutation.isError ? parseAuthError(linkMutation.error) : null) ??
      (unlinkMutation.isError ? parseAuthError(unlinkMutation.error) : null),
  };
}
