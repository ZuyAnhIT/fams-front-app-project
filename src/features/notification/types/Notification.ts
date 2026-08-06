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
  metadata: Record<string, unknown> | null;
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

export interface NotificationSetting {
  /** Null khi người dùng đang dùng giá trị mặc định từ catalog. */
  id: string | null;
  userId: string;
  eventType: string;
  /** Null với event type tùy chỉnh riêng tenant, không nằm trong catalog hệ thống. */
  label: string | null;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  customized: boolean;
  /** Null khi người dùng chưa từng lưu tùy chỉnh. */
  updatedAt: string | null;
}

export interface UpdateNotificationSettingRequest {
  inAppEnabled: boolean;
  pushEnabled: boolean;
}
