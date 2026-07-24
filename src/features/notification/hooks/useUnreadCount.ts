import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store/auth.store';

import { getNotifications } from '../services/notification.service';
import { notificationKeys } from './useNotifications';

export interface UseUnreadCountResult {
  unreadCount: number;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Badge count cho tab/header. API thật không có endpoint unread-count riêng —
 * `unreadCount` nằm trong response GET list, nên gọi list với size tối thiểu.
 */
export function useUnreadCount(): UseUnreadCountResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: notificationKeys.badge(tenantId ?? ''),
    queryFn: () => getNotifications(tenantId!, { page: 0, size: 1 }),
    enabled: !!tenantId,
    select: (data) => data.unreadCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
    refetch: () => {
      void query.refetch();
    },
  };
}
