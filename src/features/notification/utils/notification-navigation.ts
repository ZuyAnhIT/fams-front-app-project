import type { Href } from 'expo-router';

function value(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const direct = metadata?.[key];
  return typeof direct === 'string' && direct.trim() ? direct.trim() : null;
}

/** Central deep-link map shared by inbox items and FCM data payloads. */
export function resolveNotificationHref(
  eventType: string,
  metadata?: Record<string, unknown> | null,
): Href | null {
  const normalized = eventType.toUpperCase();
  if (normalized.includes('RANDOM_CHECK')) {
    const checkId = value(metadata, 'checkId');
    return checkId
      ? { pathname: '/(tabs)/random-check', params: { checkId } }
      : '/(tabs)/random-check';
  }
  // Assignment created/cancelled → the employee's own assignment list (#19). Falls back there
  // even with an assignmentId since the detail route currently redirects to the list anyway.
  if (normalized.includes('ASSIGNMENT')) return '/(tabs)/my-assignments';
  if (normalized.includes('CHECKIN') || normalized.includes('ATTENDANCE')) {
    return '/(tabs)/checkin-history';
  }
  if (normalized.includes('VIOLATION') || normalized.includes('EXPLANATION')) {
    return '/(tabs)/exceptions';
  }
  if (normalized.includes('ROLE')) return '/(tabs)/profile';
  return null;
}
