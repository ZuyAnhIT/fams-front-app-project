import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  MarkAllReadResponse,
  NotificationSetting,
  UpdateNotificationSettingRequest,
  NotificationListParams,
  NotificationListResponse,
} from '../types/Notification';

function notificationBase(tenantId: string): string {
  return `/tenants/${tenantId}/notifications`;
}

export async function getNotifications(
  tenantId: string,
  params?: NotificationListParams,
): Promise<NotificationListResponse> {
  const { data } = await apiClient.get(notificationBase(tenantId), { params });
  return unwrapApiData<NotificationListResponse>(data);
}

export async function markNotificationAsRead(
  tenantId: string,
  notificationId: string,
): Promise<void> {
  await apiClient.patch(`${notificationBase(tenantId)}/${notificationId}/read`);
}

export async function markAllNotificationsAsRead(
  tenantId: string,
): Promise<MarkAllReadResponse> {
  const { data } = await apiClient.patch(`${notificationBase(tenantId)}/read-all`);
  return unwrapApiData<MarkAllReadResponse>(data);
}

export async function markNotificationsAsRead(
  tenantId: string,
  notificationIds: string[],
): Promise<MarkAllReadResponse> {
  const { data } = await apiClient.patch(`${notificationBase(tenantId)}/read`, {
    notificationIds,
  });
  return unwrapApiData<MarkAllReadResponse>(data);
}

export async function getNotificationSettings(): Promise<NotificationSetting[]> {
  const { data } = await apiClient.get('/me/notification-settings');
  return unwrapApiData<NotificationSetting[]>(data);
}

export async function updateNotificationSetting(
  eventType: string,
  request: UpdateNotificationSettingRequest,
): Promise<NotificationSetting> {
  const { data } = await apiClient.put(
    `/me/notification-settings/${encodeURIComponent(eventType)}`,
    request,
  );
  return unwrapApiData<NotificationSetting>(data);
}
