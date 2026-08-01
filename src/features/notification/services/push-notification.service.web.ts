export interface PushMessage {
  messageId?: string;
  title?: string;
  body?: string;
  data?: Record<string, string | object>;
}

export async function registerCurrentPushDevice(): Promise<null> {
  return null;
}

export async function unregisterCurrentPushDevice(): Promise<void> {}

export async function subscribeToPushTokenRefresh(): Promise<() => void> {
  return () => undefined;
}

export async function subscribeToForegroundPush(): Promise<() => void> {
  return () => undefined;
}

export async function subscribeToNotificationOpen(): Promise<() => void> {
  return () => undefined;
}

export function isRandomCheckPush(): boolean {
  return false;
}

export function getRandomCheckIdFromPush(): null {
  return null;
}
