import type { NotificationItem } from '../types/Notification';

/**
 * Nguồn xác định "đã đọc" tập trung một chỗ. Response backend có cả `read`
 * và `isRead` với giá trị có thể khác nhau. `readAt` là bằng chứng mạnh nhất;
 * nếu chưa có thì coi thông báo đã đọc khi một trong hai boolean là true.
 */
export function isNotificationRead(
  notification: Pick<NotificationItem, 'read' | 'isRead' | 'readAt'>,
): boolean {
  return notification.readAt !== null || notification.read || notification.isRead;
}

/** Nhãn cho inbox; catalog chính thức được Backend trả riêng ở màn cài đặt. */
const EVENT_TYPE_LABELS: Record<string, string> = {
  random_check: 'Kiểm tra ngẫu nhiên',
  random_check_sent: 'Kiểm tra ngẫu nhiên',
};

export function getEventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType.toLowerCase()] ?? eventType;
}

export function isRandomCheckNotification(eventType: string): boolean {
  const normalized = eventType.toLowerCase();
  return normalized === 'random_check' || normalized === 'random_check_sent';
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
