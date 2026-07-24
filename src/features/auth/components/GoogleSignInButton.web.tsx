import { useEffect, useRef, useState, createElement } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GOOGLE_WEB_CLIENT_ID } from '@/config/google';

import { useGoogleLogin } from '../hooks/use-google-login';
import { useAuthTheme } from '../theme';

interface GoogleSignInButtonProps {
  disabled?: boolean;
}

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: Record<string, string | number | boolean>,
  ) => void;
};

type GoogleWindow = Window & {
  google?: { accounts?: { id?: GoogleIdentityApi } };
};

const GIS_SCRIPT_ID = 'google-identity-services';

/**
 * Web uses Google Identity Services so the backend receives
 * `response.credential` (a Google ID token) without a redirect URI flow.
 */
export function GoogleSignInButton({ disabled }: GoogleSignInButtonProps) {
  const theme = useAuthTheme();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const { signInWithGoogleIdToken, isPending, error } = useGoogleLogin();

  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      setSdkError('Chưa cấu hình EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
      return;
    }

    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    const handleLoad = () => setSdkReady(true);
    const handleError = () => setSdkError('Không tải được Google Identity Services');

    const googleWindow = window as GoogleWindow;
    if (googleWindow.google?.accounts?.id) {
      setSdkReady(true);
      return;
    }
    if (existing) {
      existing.addEventListener('load', handleLoad);
      existing.addEventListener('error', handleError);
      return () => {
        existing.removeEventListener('load', handleLoad);
        existing.removeEventListener('error', handleError);
      };
    }

    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.head.appendChild(script);
    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    const identity = (window as GoogleWindow).google?.accounts?.id;
    const host = hostRef.current;
    if (!sdkReady || !identity || !host || !GOOGLE_WEB_CLIENT_ID) return;

    identity.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      callback: (response) => {
        if (response.credential) signInWithGoogleIdToken(response.credential);
        else setSdkError('Google không trả về ID token');
      },
      cancel_on_tap_outside: true,
    });
    host.replaceChildren();
    identity.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.min(host.clientWidth || 360, 400),
    });
  }, [sdkReady, signInWithGoogleIdToken]);

  return (
    <View style={[styles.wrapper, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      {(!sdkReady || isPending) && <ActivityIndicator color={theme.textSecondary} size="small" />}
      {createElement('div', {
        ref: hostRef,
        style: {
          width: '100%',
          minHeight: sdkReady ? 44 : 0,
          display: isPending ? 'none' : 'flex',
          justifyContent: 'center',
        },
      })}
      {(sdkError || error) && (
        <View style={[styles.errorBanner, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>{sdkError ?? error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 10 },
  disabled: { opacity: 0.6 },
  errorBanner: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
