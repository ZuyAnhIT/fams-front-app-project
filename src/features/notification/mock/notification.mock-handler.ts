import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import type { Notification, NotificationListParams } from '../types/Notification';
import { MOCK_NOTIFICATIONS } from './mock-data';

type MockResult =
  | { response: AxiosResponse; error?: never }
  | { error: AxiosError; response?: never };

let notifications: Notification[] = [...MOCK_NOTIFICATIONS];

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

function parseQuery(config: InternalAxiosRequestConfig): NotificationListParams {
  const url = config.url ?? '';
  const queryString = url.includes('?') ? url.split('?')[1] : '';
  const params = new URLSearchParams(queryString);

  const page = Number(params.get('page') ?? '0');
  const size = Number(params.get('size') ?? '10');
  const eventType = params.get('event_type') as NotificationListParams['event_type'];

  return {
    page: Number.isFinite(page) ? page : 0,
    size: Number.isFinite(size) ? size : 10,
    event_type: eventType ?? undefined,
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

function sortByNewest(items: Notification[]): Notification[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function handleList(config: InternalAxiosRequestConfig): MockResult {
  const { page = 0, size = 10, event_type } = parseQuery(config);

  let filtered = sortByNewest(notifications);
  if (event_type && event_type !== 'all') {
    filtered = filtered.filter((n) => n.event_type === event_type);
  }

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const content = filtered.slice(start, start + size);

  return ok(config, {
    success: true,
    message: 'Success',
    data: {
      content,
      page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
    },
  });
}

function handleUnreadCount(config: InternalAxiosRequestConfig): MockResult {
  const unread = notifications.filter((n) => !n.is_read).length;
  return ok(config, {
    success: true,
    message: 'Success',
    data: { unread_count: unread },
  });
}

function handleMarkRead(
  config: InternalAxiosRequestConfig,
  id: string,
): MockResult {
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return fail(config, 404, 'Không tìm thấy thông báo');

  if (!notifications[idx].is_read) {
    notifications[idx] = {
      ...notifications[idx],
      is_read: true,
      read_at: new Date().toISOString(),
    };
  }

  return ok(config, {
    success: true,
    message: 'Success',
    data: notifications[idx],
  });
}

function handleMarkAllRead(config: InternalAxiosRequestConfig): MockResult {
  let updated = 0;
  const now = new Date().toISOString();

  notifications = notifications.map((n) => {
    if (n.is_read) return n;
    updated += 1;
    return { ...n, is_read: true, read_at: now };
  });

  return ok(config, {
    success: true,
    message: 'Success',
    data: { updated_count: updated },
  });
}

/** Returns null when the path is not a notification route. */
export async function handleNotificationMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<MockResult | null> {
  const path = normalizePath(config.url);
  const method = (config.method ?? 'get').toLowerCase();

  if (!path.startsWith('/notifications')) return null;

  await delay();

  if (method === 'get' && path === '/notifications/unread-count') {
    return handleUnreadCount(config);
  }

  if (method === 'patch' && path === '/notifications/read-all') {
    return handleMarkAllRead(config);
  }

  const readMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (method === 'patch' && readMatch) {
    return handleMarkRead(config, readMatch[1]);
  }

  if (method === 'get' && path === '/notifications') {
    return handleList(config);
  }

  return fail(config, 404, `[Mock] Route không hỗ trợ: ${method.toUpperCase()} ${path}`);
}
