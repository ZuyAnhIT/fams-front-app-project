import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isNativeDevelopmentOrProductionBuild } from '@/features/auth/runtime';
import * as SecureStorage from '@/features/auth/secure-storage';
import { apiClient } from '@/services/api-client';

const DEVICE_TOKEN_KEY = 'fams_fcm_device_token';

export interface PushMessage {
  messageId?: string;
  title?: string;
  body?: string;
  data?: Record<string, string | object>;
}

async function loadMessaging() {
  if (!isNativeDevelopmentOrProductionBuild()) return null;
  return import('@react-native-firebase/messaging');
}

/**
 * Android 8+ silently drops any notification whose channel does not exist. The backend tags
 * every push with `channelId: "fams-default"` (see FcmClient) except random-check pushes, so
 * both channels must be created before the first push arrives — do it here (called on every
 * post-auth registration) and again from the background handler (push-background.ts) so a
 * cold-start push still lands. Safe to call repeatedly; createChannel is idempotent.
 */
export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('fams-default', {
    name: 'Thông báo chung',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
  });
  await Notifications.setNotificationChannelAsync('random-checks', {
    name: 'Kiểm tra ngẫu nhiên',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
  });
}

async function hasNotificationPermission(): Promise<boolean> {
  await ensureAndroidNotificationChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function saveDeviceToken(token: string): Promise<void> {
  await apiClient.post('/me/devices', {
    deviceToken: token,
    // Both Android and iOS receive a Firebase registration token. Firebase
    // routes the iOS message onwards through the configured APNs key.
    platform: 'FCM',
  });
  await SecureStorage.setItemAsync(DEVICE_TOKEN_KEY, token);
}

/** Registers this installation after auth. Expo Go intentionally returns null. */
export async function registerCurrentPushDevice(): Promise<string | null> {
  const messagingModule = await loadMessaging();
  if (!messagingModule || !(await hasNotificationPermission())) return null;

  const messaging = messagingModule.getMessaging();
  if (!messagingModule.isDeviceRegisteredForRemoteMessages(messaging)) {
    await messagingModule.registerDeviceForRemoteMessages(messaging);
  }
  const token = await messagingModule.getToken(messaging);
  await saveDeviceToken(token);
  return token;
}

/** Removes the current installation while the access token is still valid. */
export async function unregisterCurrentPushDevice(): Promise<void> {
  const token = await SecureStorage.getItemAsync(DEVICE_TOKEN_KEY);
  if (!token) return;

  await apiClient.delete(`/me/devices/${encodeURIComponent(token)}`);
  await SecureStorage.deleteItemAsync(DEVICE_TOKEN_KEY);
}

export async function subscribeToPushTokenRefresh(
  onError?: (error: unknown) => void,
): Promise<() => void> {
  const messagingModule = await loadMessaging();
  if (!messagingModule) return () => undefined;

  return messagingModule.onTokenRefresh(
    messagingModule.getMessaging(),
    (token) => void saveDeviceToken(token).catch(onError ?? (() => undefined)),
  );
}

export async function subscribeToForegroundPush(
  listener: (message: PushMessage) => void,
): Promise<() => void> {
  const messagingModule = await loadMessaging();
  if (!messagingModule) return () => undefined;

  return messagingModule.onMessage(
    messagingModule.getMessaging(),
    (message: FirebaseMessagingTypes.RemoteMessage) => listener({
      title: message.notification?.title,
      body: message.notification?.body,
      data: message.data,
    }),
  );
}

function toPushMessage(message: FirebaseMessagingTypes.RemoteMessage): PushMessage {
  return {
    messageId: message.messageId,
    title: message.notification?.title,
    body: message.notification?.body,
    data: message.data,
  };
}

/** Handles taps from background and the notification that launched a quit app. */
export async function subscribeToNotificationOpen(
  listener: (message: PushMessage) => void,
): Promise<() => void> {
  const messagingModule = await loadMessaging();
  if (!messagingModule) return () => undefined;

  const messaging = messagingModule.getMessaging();
  const unsubscribe = messagingModule.onNotificationOpenedApp(
    messaging,
    (message) => listener(toPushMessage(message)),
  );
  const initialMessage = await messagingModule.getInitialNotification(messaging);
  if (initialMessage) listener(toPushMessage(initialMessage));
  return unsubscribe;
}

export function isRandomCheckPush(message: PushMessage): boolean {
  const eventType = getPushEventType(message);
  // Never infer navigation from localized/customizable template text.
  return eventType === 'RANDOM_CHECK_SENT' || eventType === 'RANDOM_CHECK';
}

export function getPushEventType(message: PushMessage): string {
  return String(
    message.data?.eventType ?? message.data?.type ?? message.data?.notificationType ?? '',
  ).toUpperCase();
}

/**
 * Foreground messages are rendered by the App instead of the OS tray. Preserve
 * the backend-rendered template so foreground/background content stays equal.
 */
export function formatForegroundPushMessage(
  message: PushMessage,
  fallbackTitle = 'Bạn có thông báo mới',
): string {
  const title = message.title?.trim() || fallbackTitle;
  const body = message.body?.trim();
  return body ? `${title}\n${body}` : title;
}

/** Reads the flat String→String FCM data contract, with a legacy nested fallback. */
export function getRandomCheckIdFromPush(message: PushMessage): string | null {
  const direct = message.data?.checkId;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const metadata = message.data?.metadata;
  if (metadata && typeof metadata === 'object' && 'checkId' in metadata) {
    const nested = metadata.checkId;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata) as { checkId?: unknown };
      if (typeof parsed.checkId === 'string' && parsed.checkId.trim()) {
        return parsed.checkId.trim();
      }
    } catch {
      // Older/non-random messages may carry plain-text metadata.
    }
  }
  return null;
}
