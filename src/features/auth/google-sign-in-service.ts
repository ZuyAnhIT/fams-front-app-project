import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { GOOGLE_WEB_CLIENT_ID } from '@/config/google';
import {
  isExpoGo,
  isNativeDevelopmentOrProductionBuild,
} from './runtime';

const ANDROID_PACKAGE =
  Constants.expoConfig?.android?.package ?? 'com.fams.mobile';

/** Debug value kept for Google Console guidance; native sign-in uses the SDK. */
export const GOOGLE_OAUTH_REDIRECT_URI =
  'famsfrontappproject://oauthredirect';

/** Native Google Sign-In (EAS dev build / production) — không dùng exp:// redirect */
export function isNativeGoogleSignInAvailable(): boolean {
  return isNativeDevelopmentOrProductionBuild();
}

export { isExpoGo };

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Đã hủy đăng nhập Google');
    this.name = 'GoogleSignInCancelledError';
  }
}

function isDeveloperError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return (
    err?.code === '10' ||
    (typeof err?.message === 'string' && err.message.includes('DEVELOPER_ERROR'))
  );
}

/** Hướng dẫn khi Android báo DEVELOPER_ERROR (SHA-1 / package chưa khớp Google Console) */
export function getAndroidDeveloperErrorHint(): string {
  return (
    'DEVELOPER_ERROR — Google Console chưa khớp app Android.\n\n' +
    'Native Sign-In trên Android cần OAuth client loại **Android** (ngoài Web Client ID):\n' +
    `1. Google Cloud Console → Credentials → Create OAuth client → Android\n` +
    `2. Package name: ${ANDROID_PACKAGE}\n` +
    '3. SHA-1: chạy `eas credentials -p android` → chọn profile development → copy SHA-1 fingerprint\n' +
    '4. Trong app vẫn dùng **Web Client ID** làm EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (không dùng Android Client ID)\n' +
    '5. Đợi 5–10 phút sau khi lưu, rồi thử đăng nhập lại'
  );
}

function formatGoogleSignInError(e: unknown): string {
  if (isDeveloperError(e)) {
    return getAndroidDeveloperErrorHint();
  }
  return e instanceof Error ? e.message : 'Đăng nhập Google thất bại';
}

/**
 * Lấy Google ID token qua @react-native-google-signin (chỉ Web Client ID).
 * Chỉ hoạt động trên development build / EAS build — không chạy trong Expo Go.
 */
export async function getGoogleIdTokenNative(): Promise<string> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  try {
    const result = await GoogleSignin.signIn();
    if (result.type === 'cancelled') {
      throw new GoogleSignInCancelledError();
    }

    const idToken = result.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
    if (!idToken) {
      throw new Error('Không nhận được Google ID token. Kiểm tra Web Client ID trên Google Console.');
    }

    return idToken;
  } catch (e) {
    if (e instanceof GoogleSignInCancelledError) throw e;
    throw new Error(formatGoogleSignInError(e));
  }
}

/** Gợi ý cấu hình Google Console theo môi trường hiện tại */
export function getGoogleOAuthSetupHint(): string {
  if (isExpoGo()) {
    return (
      'Expo Go không chứa native module Google Sign-In của FAMS. ' +
      'Hãy cài FAMS Development Build rồi mở Metro bằng `npm run start:dev-client:lan`.'
    );
  }
  return (
    'Thêm redirect URI sau vào Google Console → Web client → Authorized redirect URIs:\n' +
    GOOGLE_OAUTH_REDIRECT_URI
  );
}
