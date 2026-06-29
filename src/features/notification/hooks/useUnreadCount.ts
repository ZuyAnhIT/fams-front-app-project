import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/store';

import { getUnreadCount } from '../services/notification.service';
import { useNotificationStore } from '../store/notificationStore';
import { notificationKeys } from './useNotifications';

export interface UseUnreadCountResult {
  unreadCount: number;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Fetches unread notification count and syncs it into Zustand
 * for tab badge and other global UI surfaces.
 */
export function useUnreadCount(): UseUnreadCountResult {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    select: (data) => data.unread_count,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  useEffect(() => {
    if (typeof query.data === 'number') {
      setUnreadCount(query.data);
    }
  }, [query.data, setUnreadCount]);

  return {
    unreadCount,
    isLoading: query.isLoading,
    refetch: () => {
      void query.refetch();
    },
  };
}
