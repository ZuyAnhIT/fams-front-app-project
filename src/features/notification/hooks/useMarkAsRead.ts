import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';

import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notification.service';
import { useNotificationStore } from '../store/notificationStore';
import type { Notification } from '../types/Notification';
import { notificationKeys } from './useNotifications';

export interface UseMarkAsReadResult {
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  isMarkingRead: boolean;
  isMarkingAllRead: boolean;
  markReadError: unknown;
  markAllReadError: unknown;
}

function wasUnreadInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
): boolean {
  const queries = queryClient.getQueriesData<{ pages: Array<{ content: Notification[] }> }>({
    queryKey: notificationKeys.lists(),
  });

  for (const [, data] of queries) {
    const found = data?.pages
      .flatMap((page) => page.content)
      .find((item) => item.id === id);
    if (found) return !found.is_read;
  }

  return false;
}

function patchNotificationInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  updater: (item: Notification) => Notification,
): void {
  queryClient.setQueriesData<{ pages: Array<{ content: Notification[] }> }>(
    { queryKey: notificationKeys.lists() },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          content: page.content.map((item) => (item.id === id ? updater(item) : item)),
        })),
      };
    },
  );
}

export function useMarkAsRead(): UseMarkAsReadResult {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const decrementUnreadCount = useNotificationStore((s) => s.decrementUnreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (updated) => {
      const wasUnread = wasUnreadInCache(queryClient, updated.id);
      patchNotificationInCache(queryClient, updated.id, () => updated);
      if (wasUnread) {
        decrementUnreadCount(1);
      }
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
    onError: () => {
      showToast('Không thể đánh dấu đã đọc', 'error');
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: (result) => {
      if (result.updated_count > 0) {
        showToast('Đã đánh dấu tất cả là đã đọc', 'success');
      }
      queryClient.setQueriesData<{ pages: Array<{ content: Notification[] }> }>(
        { queryKey: notificationKeys.lists() },
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              content: page.content.map((item) =>
                item.is_read ? item : { ...item, is_read: true, read_at: now },
              ),
            })),
          };
        },
      );
      setUnreadCount(0);
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      return result;
    },
    onError: () => {
      showToast('Không thể đánh dấu đã đọc tất cả', 'error');
    },
  });

  return {
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllMutation.isPending,
    markReadError: markReadMutation.error,
    markAllReadError: markAllMutation.error,
  };
}
