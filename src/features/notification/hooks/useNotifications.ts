import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getNotifications } from '../services/notification.service';
import type {
  Notification,
  NotificationEventType,
  NotificationListResponse,
} from '../types/Notification';

const DEFAULT_PAGE_SIZE = 10;

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (eventType: NotificationEventType | 'all') =>
    [...notificationKeys.lists(), eventType] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export interface UseNotificationsOptions {
  eventType?: NotificationEventType | 'all';
  pageSize?: number;
}

export interface UseNotificationsResult {
  notifications: Notification[];
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
  const { eventType = 'all', pageSize = DEFAULT_PAGE_SIZE } = options;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query: UseInfiniteQueryResult<
    InfiniteData<NotificationListResponse>,
    Error
  > = useInfiniteQuery({
    queryKey: notificationKeys.list(eventType),
    queryFn: ({ pageParam }) =>
      getNotifications({
        page: pageParam,
        size: pageSize,
        event_type: eventType,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const notifications = query.data?.pages.flatMap((page) => page.content) ?? [];

  return {
    notifications,
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
