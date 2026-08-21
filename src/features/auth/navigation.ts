import { router } from 'expo-router';
import { Platform } from 'react-native';

const mobileLoginUrl = process.env.EXPO_PUBLIC_MOBILE_LOGIN_URL?.trim() ?? '';

export function canOpenMobileLogin(): boolean {
  return Platform.OS === 'web' && mobileLoginUrl.length > 0;
}

/**
 * Email links open in a browser. During LAN testing this hands control back to
 * Expo Go (or a Development Build when configured) instead of leaving the user
 * on the web login page.
 */
export function navigateToLogin(): void {
  if (canOpenMobileLogin() && typeof window !== 'undefined') {
    window.location.assign(mobileLoginUrl);
    return;
  }

  router.replace('/(auth)/login');
}

/** Back for auth subflows, with a deterministic destination for cold deep links. */
export function navigateBackToLogin(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  navigateToLogin();
}
