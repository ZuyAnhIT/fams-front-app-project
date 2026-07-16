import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import type { NotificationItem } from '../types/Notification';
import { MOCK_NOTIFICATIONS } from './mock-data';

type MockResult =
  | { response: AxiosResponse; error?: never }
  | { error: AxiosError; response?: never };

let notifications: NotificationItem[] = [...MOCK_NOTIFICATIONS];

const MOCK_DELAY_MS = 300;

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePath(url: string | undefined): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api\/v1/, '')
    .replace(/^\/api/, '')
    .split('?')[0]
    .replace(/\/$/, '');
}

function parseQuery(url: string | undefined): { page: number; size: number; unreadOnly: boolean } {
  const queryString = url?.includes('?') ? url.split('?')[1] : '';
  const params = new URLSearchParams(queryString);

  const page = Number(params.get('page') ?? '0');
  const size = Number(params.get('size') ?? '20');

  return {
    page: Number.isFinite(page) ? page : 0,
    size: Number.isFinite(size) ? size : 20,
    unreadOnly: params.get('unreadOnly') === 'true',
  };
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): MockResult {
  return {
    response: { data, status, statusText: 'OK', headers: {}, config },
  };
}

function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string,
): MockResult {
  const data = { message };
  const error = new AxiosError(message, String(status), config, undefined, {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config,
  });
  return { error };
}

function sortByNewest(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function handleList(config: InternalAxiosRequestConfig, tenantId: string): MockResult {
  const { page, size, unreadOnly } = parseQuery(config.url);

  const tenantNotifications = notifications.filter((n) => n.tenantId === tenantId);
  const unreadCount = tenantNotifications.filter((n) => !n.read).length;

  let filtered = sortByNewest(tenantNotifications);
  if (unreadOnly) {
    filtered = filtered.filter((n) => !n.read);
  }

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const items = filtered.slice(start, start + size);

  return ok(config, {
    success: true,
    message: 'Success',
    data: {
      items,
      page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
      unreadCount,
    },
  });
}

function handleMarkRead(
  config: InternalAxiosRequestConfig,
  tenantId: string,
  notificationId: string,
): MockResult {
  const idx = notifications.findIndex(
    (n) => n.id === notificationId && n.tenantId === tenantId,
  );
  if (idx === -1) return fail(config, 404, 'Không tìm thấy thông báo');

  if (!notifications[idx].read) {
    notifications[idx] = {
      ...notifications[idx],
      read: true,
      isRead: true,
      readAt: new Date().toISOString(),
    };
  }

  return ok(config, { success: true, message: 'Success', data: notifications[idx] });
}

function handleMarkAllRead(
  config: InternalAxiosRequestConfig,
  tenantId: string,
): MockResult {
  let markedCount = 0;
  const now = new Date().toISOString();

  notifications = notifications.map((n) => {
    if (n.tenantId !== tenantId || n.read) return n;
    markedCount += 1;
    return { ...n, read: true, isRead: true, readAt: now };
  });

  return ok(config, { success: true, message: 'Success', data: { markedCount } });
}

/** Returns null when the path is not a tenant notification route. */
export async function handleNotificationMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<MockResult | null> {
  const path = normalizePath(config.url);
  const method = (config.method ?? 'get').toLowerCase();

  const base = path.match(/^\/tenants\/([^/]+)\/notifications(.*)$/);
  if (!base) return null;

  const tenantId = base[1];
  const rest = base[2];

  await delay();

  if (method === 'get' && rest === '') {
    return handleList(config, tenantId);
  }

  if (method === 'patch' && rest === '/read-all') {
    return handleMarkAllRead(config, tenantId);
  }

  const readMatch = rest.match(/^\/([^/]+)\/read$/);
  if (method === 'patch' && readMatch) {
    return handleMarkRead(config, tenantId, readMatch[1]);
  }

  return fail(config, 404, `[Mock] Route không hỗ trợ: ${method.toUpperCase()} ${path}`);
}
