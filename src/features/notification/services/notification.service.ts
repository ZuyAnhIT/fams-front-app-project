import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  MarkAllReadResponse,
  Notification,
  NotificationListParams,
  NotificationListResponse,
  UnreadCountResponse,
} from '../types/Notification';

const BASE = '/notifications';

function buildListParams(params?: NotificationListParams) {
  const { event_type, ...rest } = params ?? {};
  return {
    ...rest,
    ...(event_type && event_type !== 'all' ? { event_type } : {}),
  };
}

export async function getNotifications(
  params?: NotificationListParams,
): Promise<NotificationListResponse> {
  const { data } = await apiClient.get(BASE, { params: buildListParams(params) });
  return unwrapApiData<NotificationListResponse>(data);
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get(`${BASE}/unread-count`);
  return unwrapApiData<UnreadCountResponse>(data);
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  const { data } = await apiClient.patch(`${BASE}/${id}/read`);
  return unwrapApiData<Notification>(data);
}

export async function markAllNotificationsAsRead(): Promise<MarkAllReadResponse> {
  const { data } = await apiClient.patch(`${BASE}/read-all`);
  return unwrapApiData<MarkAllReadResponse>(data);
}
