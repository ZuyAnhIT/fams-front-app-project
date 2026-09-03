import { isNativeDevelopmentOrProductionBuild } from '@/features/auth/runtime';

import { ensureAndroidNotificationChannels } from './services/push-notification.service';

/**
 * #19 (2026-09-03): registers the Firebase Cloud Messaging **background** message handler.
 *
 * React Native Firebase requires this to be called from the JS entry point, outside of any React
 * component, or it warns and drops data messages that arrive while the app is backgrounded or
 * killed. Our backend always sends a `notification` block, so Android/iOS render the tray banner
 * on their own — this handler's job is only to (a) satisfy the RNFB contract and (b) make sure
 * the `fams-default` Android channel exists on a cold start so the very first push isn't
 * silently dropped. The actual deep-link on tap is handled by `subscribeToNotificationOpen`
 * once the app is running (see app/_layout.tsx).
 *
 * Expo Go has no native Firebase module, so this is a no-op there.
 */
export function registerPushBackgroundHandler(): void {
  if (!isNativeDevelopmentOrProductionBuild()) return;

  import('@react-native-firebase/messaging')
    .then((messagingModule) => {
      const messaging = messagingModule.getMessaging();
      messagingModule.setBackgroundMessageHandler(messaging, async () => {
        // Nothing to do beyond ensuring the channel is present — the OS already shows the
        // notification, and the inbox re-syncs when the user next opens the app.
        await ensureAndroidNotificationChannels();
      });
    })
    .catch(() => {
      // Push is supplementary; the in-app inbox + polling still work without it.
    });
}
