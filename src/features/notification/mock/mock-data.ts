import type { NotificationItem } from '../types/Notification';

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

const MOCK_TENANT_ID = 'tenant-mock-001';
const MOCK_USER_ID = 'user-mock-001';

function item(
  partial: Pick<NotificationItem, 'id' | 'eventType' | 'title' | 'body' | 'createdAt'> & {
    read?: boolean;
    readAt?: string | null;
  },
): NotificationItem {
  const read = partial.read ?? false;
  return {
    id: partial.id,
    tenantId: MOCK_TENANT_ID,
    userId: MOCK_USER_ID,
    eventType: partial.eventType,
    title: partial.title,
    body: partial.body,
    createdAt: partial.createdAt,
    read,
    isRead: read,
    readAt: partial.readAt ?? (read ? partial.createdAt : null),
  };
}

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  item({
    id: 'notif-001',
    eventType: 'random_check',
    title: 'Yêu cầu kiểm tra ngẫu nhiên',
    body: 'Bạn có 5 phút để hoàn thành xác minh khuôn mặt.',
    createdAt: hoursAgo(0.1),
  }),
  item({
    id: 'notif-002',
    eventType: 'violation',
    title: 'Vi phạm chấm công',
    body: 'Bạn đi muộn 15 phút vào sáng nay.',
    createdAt: hoursAgo(2),
  }),
  item({
    id: 'notif-003',
    eventType: 'assignment',
    title: 'Phân công ca làm mới',
    body: 'Ca chiều 13:00–17:00 tại chi nhánh Quận 1.',
    createdAt: hoursAgo(5),
  }),
  item({
    id: 'notif-004',
    eventType: 'checkin',
    title: 'Chấm công thành công',
    body: 'Check-in lúc 08:02 tại văn phòng HCM.',
    createdAt: hoursAgo(8),
    read: true,
    readAt: hoursAgo(7.5),
  }),
  item({
    id: 'notif-005',
    eventType: 'system_alert',
    title: 'Cảnh báo hệ thống',
    body: 'Bảo trì hệ thống lúc 22:00 hôm nay.',
    createdAt: hoursAgo(24),
    read: true,
    readAt: hoursAgo(20),
  }),
  item({
    id: 'notif-006',
    eventType: 'attendance',
    title: 'Bảng công tháng đã cập nhật',
    body: 'Xem chi tiết công tháng 6/2026.',
    createdAt: hoursAgo(48),
    read: true,
    readAt: hoursAgo(40),
  }),
  item({
    id: 'notif-007',
    eventType: 'random_check',
    title: 'Kiểm tra ngẫu nhiên đã hết hạn',
    body: 'Bạn không phản hồi yêu cầu kiểm tra hôm qua.',
    createdAt: hoursAgo(72),
    read: true,
    readAt: hoursAgo(70),
  }),
  item({
    id: 'notif-008',
    eventType: 'checkin',
    title: 'Nhắc nhở chấm công',
    body: 'Bạn chưa check-out hôm nay.',
    createdAt: hoursAgo(1),
  }),
];
