/**
 * Khớp NotificationResponse/NotificationPageResponse của backend.
 * ⚠️ Response thật có cả `read` và `isRead`, hai giá trị có thể khác nhau.
 * Tạm dùng `read` làm nguồn chính — xem `isNotificationRead()` trong
 * `utils/notification.utils.ts` để đổi tập trung một chỗ khi cần.
 */
export interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  /** Không có enum cố định từ Swagger — backend có thể trả bất kỳ string nào. */
  eventType: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  read: boolean;
  isRead: boolean;
}

export interface NotificationListParams {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  unreadCount: number;
}

export interface MarkAllReadResponse {
  markedCount: number;
}
