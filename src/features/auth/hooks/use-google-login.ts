import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/ui/toast';
import { GOOGLE_WEB_CLIENT_ID } from '@/config/google';

import {
  getGoogleIdTokenNative,
  GOOGLE_OAUTH_REDIRECT_URI,
  GoogleSignInCancelledError,
  getGoogleOAuthSetupHint,
  isExpoGo,
  isNativeGoogleSignInAvailable,
} from '../google-sign-in-service';
import { loginWithGoogle } from '../api';
import { navigateAfterAuth, resolveAuthenticatedSession } from '../session';
import { useAuthStore } from '../store';
import { parseAuthError } from '../utils';

export interface UseGoogleLoginResult {
  signInWithGoogle: () => void;
  /** Dùng bởi Google Identity Services trên web (`response.credential`). */
  signInWithGoogleIdToken: (idToken: string) => void;
  isReady: boolean;
  isPending: boolean;
  error: string | null;
  /** Redirect URI cần đăng ký trên Google Console (debug) */
  redirectUri: string;
}

export function useGoogleLogin(): UseGoogleLoginResult {
  const { setTokens, setUser, set2FARequired } = useAuthStore();
  const { showToast } = useToast();
  const [sessionError, setSessionError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (idToken: string) =>
      loginWithGoogle({ id_token: idToken }),
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
      showToast('Đăng nhập Google thành công', 'success');
      navigateAfterAuth(session);
    },
  });

  const exchangeIdToken = useCallback(
    (idToken: string) => {
      setSessionError(null);
      mutation.mutate(idToken);
    },
    [mutation],
  );

  const signInWithGoogle = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) return;

    setSessionError(null);

    if (isNativeGoogleSignInAvailable()) {
      try {
        const idToken = await getGoogleIdTokenNative();
        exchangeIdToken(idToken);
      } catch (e) {
        if (e instanceof GoogleSignInCancelledError) return;
        setSessionError(e instanceof Error ? e.message : 'Đăng nhập Google thất bại');
      }
      return;
    }

    if (isExpoGo()) {
      setSessionError(getGoogleOAuthSetupHint());
      return;
    }

    setSessionError(
      Platform.OS === 'web'
        ? 'Google Sign-In trên web sử dụng nút Google Identity Services.'
        : 'Google Sign-In native chưa sẵn sàng.',
    );
  };

  const configError = !GOOGLE_WEB_CLIENT_ID
    ? 'Chưa cấu hình EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'
    : null;

  const isReady = !!GOOGLE_WEB_CLIENT_ID;

  return {
    signInWithGoogle: () => {
      void signInWithGoogle();
    },
    signInWithGoogleIdToken: exchangeIdToken,
    isReady,
    isPending: mutation.isPending,
    error:
      configError ??
      sessionError ??
      (mutation.isError ? parseAuthError(mutation.error) : null),
    redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
  };
}
