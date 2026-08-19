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
  /** Catalog có event chính thức; tenant vẫn có thể lưu event tùy chỉnh. */
  eventType: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  read: boolean;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  priority: "low" | "normal" | "high" | "critical";
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
  /** True với eventType priority=critical (VD: RANDOM_CHECK_SENT) — backend từ chối tắt
   *  inAppEnabled/pushEnabled cho loại này (422 MANDATORY_NOTIFICATION), nên UI phải khóa switch
   *  thay vì để người dùng bấm rồi gặp lỗi. */
  mandatory: boolean;
  /** Null khi người dùng chưa từng lưu tùy chỉnh. */
  updatedAt: string | null;
}

export interface UpdateNotificationSettingRequest {
  inAppEnabled: boolean;
  pushEnabled: boolean;
}
