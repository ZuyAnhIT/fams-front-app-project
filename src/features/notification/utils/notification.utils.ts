import type { NotificationItem } from '../types/Notification';

/**
 * Nguồn xác định "đã đọc" tập trung một chỗ. Response backend có cả `read`
 * và `isRead` với giá trị có thể khác nhau (chưa xác nhận field nào đúng) —
 * tạm dùng `read`. Đổi ở đây nếu backend xác nhận `isRead` mới là đúng.
 */
export function isNotificationRead(notification: Pick<NotificationItem, 'read'>): boolean {
  return notification.read;
}

/** Best-effort — Swagger không công bố danh sách eventType cố định. */
const EVENT_TYPE_LABELS: Record<string, string> = {
  random_check: 'Kiểm tra ngẫu nhiên',
  violation: 'Vi phạm',
  system_alert: 'Hệ thống',
  assignment: 'Phân công',
  checkin: 'Chấm công',
  attendance: 'Công',
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  random_check: '🎲',
  violation: '⚠️',
  system_alert: '🔔',
  assignment: '📋',
  checkin: '✅',
  attendance: '📊',
};

const DEFAULT_LABEL = 'Thông báo';
const DEFAULT_ICON = '🔔';

export function getEventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? DEFAULT_LABEL;
}

export function getEventTypeIcon(eventType: string): string {
  return EVENT_TYPE_ICONS[eventType] ?? DEFAULT_ICON;
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
