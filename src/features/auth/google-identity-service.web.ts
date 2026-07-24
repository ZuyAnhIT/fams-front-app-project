import { GOOGLE_WEB_CLIENT_ID } from '@/config/google';

type CredentialResponse = { credential?: string };
type PromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
  getDismissedReason?: () => string;
};
type IdentityApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (callback: (notification: PromptNotification) => void) => void;
};

type GoogleWindow = Window & {
  google?: { accounts?: { id?: IdentityApi } };
};

const SCRIPT_ID = 'google-identity-services';

async function loadGoogleIdentityServices(): Promise<IdentityApi> {
  const googleWindow = window as GoogleWindow;
  if (googleWindow.google?.accounts?.id) return googleWindow.google.accounts.id;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    const onLoad = () => resolve();
    const onError = () => reject(new Error('Không tải được Google Identity Services'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  const identity = googleWindow.google?.accounts?.id;
  if (!identity) throw new Error('Google Identity Services chưa sẵn sàng');
  return identity;
}

export async function requestGoogleIdTokenWeb(): Promise<string> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Chưa cấu hình EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  }
  const identity = await loadGoogleIdentityServices();

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    identity.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      callback: (response) => {
        if (settled) return;
        settled = true;
        if (response.credential) resolve(response.credential);
        else reject(new Error('Google không trả về ID token'));
      },
      cancel_on_tap_outside: true,
    });
    identity.prompt((notification) => {
      if (settled) return;
      if (
        notification.isNotDisplayed() ||
        notification.isSkippedMoment() ||
        notification.isDismissedMoment()
      ) {
        settled = true;
        const reason =
          notification.getNotDisplayedReason?.() ??
          notification.getSkippedReason?.() ??
          notification.getDismissedReason?.();
        reject(new Error(reason ? `Không thể mở Google Sign-In (${reason})` : 'Đã hủy Google Sign-In'));
      }
    });
  });
}
