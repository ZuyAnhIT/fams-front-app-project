import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';
import { useToast } from '@/components/ui/toast';

import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationsAsRead,
} from '../services/notification.service';
import type { NotificationItem, NotificationListResponse } from '../types/Notification';
import { notificationKeys } from './useNotifications';

export interface UseMarkAsReadResult {
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markSelectedAsRead: (ids: string[]) => void;
  isMarkingRead: boolean;
  isMarkingAllRead: boolean;
  isMarkingSelectedRead: boolean;
  markReadError: unknown;
  markAllReadError: unknown;
  markSelectedReadError: unknown;
}

function patchListsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  updater: (item: NotificationItem) => NotificationItem,
  matchId?: string,
): void {
  queryClient.setQueriesData<InfiniteData<NotificationListResponse>>(
    { queryKey: notificationKeys.lists(tenantId) },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            !matchId || item.id === matchId ? updater(item) : item,
          ),
        })),
      };
    },
  );
}

export function useMarkAsRead(): UseMarkAsReadResult {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(tenantId!, id),
    onSuccess: (_result, id) => {
      const now = new Date().toISOString();
      patchListsCache(
        queryClient,
        tenantId!,
        (item) => ({ ...item, read: true, isRead: true, readAt: item.readAt ?? now }),
        id,
      );
      void queryClient.invalidateQueries({ queryKey: notificationKeys.badge(tenantId!) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists(tenantId!) });
    },
    onError: () => {
      showToast('Không thể đánh dấu đã đọc', 'error');
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(tenantId!),
    onSuccess: (result) => {
      if (result.markedCount > 0) {
        showToast('Đã đánh dấu tất cả là đã đọc', 'success');
      }
      const now = new Date().toISOString();
      patchListsCache(queryClient, tenantId!, (item) => ({
        ...item,
        read: true,
        isRead: true,
        readAt: item.readAt ?? now,
      }));
      void queryClient.invalidateQueries({ queryKey: notificationKeys.badge(tenantId!) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists(tenantId!) });
    },
    onError: () => {
      showToast('Không thể đánh dấu đã đọc tất cả', 'error');
    },
  });

  const markSelectedMutation = useMutation({
    mutationFn: (ids: string[]) => markNotificationsAsRead(tenantId!, ids),
    onSuccess: (result, ids) => {
      const selected = new Set(ids);
      const now = new Date().toISOString();
      patchListsCache(queryClient, tenantId!, (item) =>
        selected.has(item.id)
          ? { ...item, read: true, isRead: true, readAt: item.readAt ?? now }
          : item,
      );
      if (result.markedCount > 0) {
        showToast(`Đã đánh dấu ${result.markedCount} thông báo là đã đọc`, 'success');
      }
      void queryClient.invalidateQueries({ queryKey: notificationKeys.badge(tenantId!) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists(tenantId!) });
    },
    onError: () => showToast('Không thể đánh dấu nhóm thông báo đã đọc', 'error'),
  });

  return {
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllMutation.mutate,
    markSelectedAsRead: markSelectedMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllMutation.isPending,
    isMarkingSelectedRead: markSelectedMutation.isPending,
    markReadError: markReadMutation.error,
    markAllReadError: markAllMutation.error,
    markSelectedReadError: markSelectedMutation.error,
  };
}
