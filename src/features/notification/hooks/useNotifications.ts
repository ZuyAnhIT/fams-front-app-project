import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getNotifications } from '../services/notification.service';
import type { NotificationItem, NotificationListResponse } from '../types/Notification';

const DEFAULT_PAGE_SIZE = 20;

export const notificationKeys = {
  all: (tenantId: string) => ['notifications', tenantId] as const,
  lists: (tenantId: string) => [...notificationKeys.all(tenantId), 'list'] as const,
  list: (tenantId: string, unreadOnly: boolean) =>
    [...notificationKeys.lists(tenantId), { unreadOnly }] as const,
  badge: (tenantId: string) => [...notificationKeys.all(tenantId), 'badge'] as const,
};

export interface UseNotificationsOptions {
  unreadOnly?: boolean;
  pageSize?: number;
}

export interface UseNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsResult {
  const { unreadOnly = false, pageSize = DEFAULT_PAGE_SIZE } = options;
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query: UseInfiniteQueryResult<InfiniteData<NotificationListResponse>, Error> =
    useInfiniteQuery({
      queryKey: notificationKeys.list(tenantId ?? '', unreadOnly),
      queryFn: ({ pageParam }) =>
        getNotifications(tenantId!, { page: pageParam, size: pageSize, unreadOnly }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
      enabled: !!tenantId,
      staleTime: 60 * 1000,
    });

  const notifications = query.data?.pages.flatMap((page) => page.items) ?? [];
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
    refetch: () => {
      void query.refetch();
    },
  };
}
