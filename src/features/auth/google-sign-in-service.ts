import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { GOOGLE_WEB_CLIENT_ID } from '@/config/google';

const ANDROID_PACKAGE =
  Constants.expoConfig?.android?.package ?? 'com.fams.mobile';

/** Redirect URI gửi lên Google OAuth — đăng ký trong Google Cloud Console */
export const GOOGLE_OAUTH_REDIRECT_URI = makeRedirectUri({
  scheme: 'famsfrontappproject',
  path: 'oauthredirect',
});

/** true khi chạy trong Expo Go (không phải EAS dev build) */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/** Native Google Sign-In (EAS dev build / production) — không dùng exp:// redirect */
export function isNativeGoogleSignInAvailable(): boolean {
  return Platform.OS !== 'web' && !isExpoGo();
}

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

  // #region agent log
  fetch('http://127.0.0.1:7569/ingest/cdcc833e-b1f1-4602-a45f-9f9830cbf8bc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'03d2d2'},body:JSON.stringify({sessionId:'03d2d2',location:'google-sign-in-service.ts:configure',message:'native google sign-in configure',data:{platform:Platform.OS,androidPackage:ANDROID_PACKAGE,hasWebClientId:!!GOOGLE_WEB_CLIENT_ID,clientIdSuffix:GOOGLE_WEB_CLIENT_ID.slice(-20)},timestamp:Date.now(),hypothesisId:'B-D-E',runId:'dev-error'})}).catch(()=>{});
  // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7569/ingest/cdcc833e-b1f1-4602-a45f-9f9830cbf8bc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'03d2d2'},body:JSON.stringify({sessionId:'03d2d2',location:'google-sign-in-service.ts:success',message:'native google sign-in got id token',data:{hasIdToken:true},timestamp:Date.now(),hypothesisId:'success',runId:'dev-error'})}).catch(()=>{});
    // #endregion

    return idToken;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    // #region agent log
    fetch('http://127.0.0.1:7569/ingest/cdcc833e-b1f1-4602-a45f-9f9830cbf8bc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'03d2d2'},body:JSON.stringify({sessionId:'03d2d2',location:'google-sign-in-service.ts:signIn-error',message:'native google sign-in failed',data:{code:err?.code,message:err?.message,isDeveloperError:isDeveloperError(e),androidPackage:ANDROID_PACKAGE},timestamp:Date.now(),hypothesisId:'A-B-C',runId:'dev-error'})}).catch(()=>{});
    // #endregion
    throw new Error(formatGoogleSignInError(e));
  }
}

/** Gợi ý cấu hình Google Console theo môi trường hiện tại */
export function getGoogleOAuthSetupHint(): string {
  if (isExpoGo()) {
    return (
      'Expo Go dùng redirect exp:// — Google không chấp nhận mặc định. ' +
      'Hãy build app bằng EAS (development build) hoặc thêm redirect URI sau vào Google Console → Web client → Authorized redirect URIs:\n' +
      GOOGLE_OAUTH_REDIRECT_URI
    );
  }
  return (
    'Thêm redirect URI sau vào Google Console → Web client → Authorized redirect URIs:\n' +
    GOOGLE_OAUTH_REDIRECT_URI
  );
}
