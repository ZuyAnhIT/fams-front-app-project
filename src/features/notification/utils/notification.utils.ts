import type { NotificationEventType } from '../types/Notification';

export const EVENT_TYPE_LABELS: Record<NotificationEventType, string> = {
  random_check: 'Kiểm tra ngẫu nhiên',
  violation: 'Vi phạm',
  system_alert: 'Hệ thống',
  assignment: 'Phân công',
  checkin: 'Chấm công',
  attendance: 'Công',
};

export const EVENT_TYPE_ICONS: Record<NotificationEventType, string> = {
  random_check: '🎲',
  violation: '⚠️',
  system_alert: '🔔',
  assignment: '📋',
  checkin: '✅',
  attendance: '📊',
};

export const EVENT_TYPE_FILTER_OPTIONS: Array<{
  value: NotificationEventType | 'all';
  label: string;
}> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'random_check', label: EVENT_TYPE_LABELS.random_check },
  { value: 'violation', label: EVENT_TYPE_LABELS.violation },
  { value: 'system_alert', label: EVENT_TYPE_LABELS.system_alert },
  { value: 'assignment', label: EVENT_TYPE_LABELS.assignment },
  { value: 'checkin', label: EVENT_TYPE_LABELS.checkin },
  { value: 'attendance', label: EVENT_TYPE_LABELS.attendance },
];

export function getEventTypeLabel(eventType: NotificationEventType): string {
  return EVENT_TYPE_LABELS[eventType];
}

export function getEventTypeIcon(eventType: NotificationEventType): string {
  return EVENT_TYPE_ICONS[eventType];
}

export function formatNotificationTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
