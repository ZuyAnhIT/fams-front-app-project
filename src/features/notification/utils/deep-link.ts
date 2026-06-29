import { router } from 'expo-router';

/**
 * Điều hướng tới route nội bộ từ deep_link của notification.
 * Chấp nhận path Expo Router (vd. `/assignment/abc`, `/modal/random-check-result`).
 */
export function navigateToNotificationDeepLink(deepLink: string | null | undefined): void {
  if (!deepLink?.trim()) return;

  const path = deepLink.startsWith('/') ? deepLink : `/${deepLink}`;
  router.push(path as never);
}
