import { useMutation } from '@tanstack/react-query';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
} from '../services/google-sign-in-service';
import { loginWithGoogle } from '../services/auth.service';
import { navigateAfterAuth, resolveAuthenticatedSession } from '../utils/session';
import { useAuthStore } from '../store/auth.store';
import { parseAuthError } from '../utils/auth.utils';
import { getDeviceId } from '@/services/avatar-upload';

WebBrowser.maybeCompleteAuthSession();

export interface UseGoogleLoginResult {
  signInWithGoogle: () => void;
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
  const useAuthSession = Platform.OS === 'web' || isExpoGo();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
    },
    { scheme: 'famsfrontappproject' },
  );

  const mutation = useMutation({
    mutationFn: (idToken: string) =>
      loginWithGoogle({ id_token: idToken, device_id: getDeviceId() }),
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

  useEffect(() => {
    if (!useAuthSession || response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (idToken) {
      exchangeIdToken(idToken);
    }
  }, [response, useAuthSession, exchangeIdToken]);

  useEffect(() => {
    if (!useAuthSession || !response) return;
    if (response.type === 'error') {
      const msg = response.error?.message ?? response.params?.error ?? '';
      if (msg.includes('invalid_request') || response.params?.error === 'invalid_request') {
        setSessionError(getGoogleOAuthSetupHint());
      } else {
        setSessionError(msg || 'Đăng nhập Google thất bại');
      }
    }
  }, [response, useAuthSession]);

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

    await promptAsync();
  };

  const configError = !GOOGLE_WEB_CLIENT_ID
    ? 'Chưa cấu hình EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'
    : null;

  const isReady = useAuthSession
    ? !!request && !!GOOGLE_WEB_CLIENT_ID
    : !!GOOGLE_WEB_CLIENT_ID;

  return {
    signInWithGoogle: () => {
      void signInWithGoogle();
    },
    isReady,
    isPending: mutation.isPending,
    error:
      configError ??
      sessionError ??
      (mutation.isError ? parseAuthError(mutation.error) : null),
    redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
  };
}
