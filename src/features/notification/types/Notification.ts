/** Loại sự kiện thông báo in-app – mở rộng khi thêm module mới. */
export type NotificationEventType =
  | 'random_check'
  | 'violation'
  | 'system_alert'
  | 'assignment'
  | 'checkin'
  | 'attendance';

export interface Notification {
  id: string;
  title: string;
  body: string;
  event_type: NotificationEventType;
  is_read: boolean;
  deep_link: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationListParams {
  page?: number;
  size?: number;
  event_type?: NotificationEventType | 'all';
}

/** Chuẩn PageResponse của Spring Boot backend. */
export interface NotificationListResponse {
  content: Notification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAllReadResponse {
  updated_count: number;
}
