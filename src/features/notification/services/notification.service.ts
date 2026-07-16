import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  MarkAllReadResponse,
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
