import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';

import { getNotificationSettings, updateNotificationSetting } from '../services/notification.service';
import type { UpdateNotificationSettingRequest } from '../types/Notification';

export const notificationSettingKeys = {
  all: ['notification-settings'] as const,
};

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationSettingKeys.all,
    queryFn: getNotificationSettings,
  });
}

export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ eventType, request }: { eventType: string; request: UpdateNotificationSettingRequest }) =>
      updateNotificationSetting(eventType, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationSettingKeys.all });
    },
    onError: () => showToast('Không thể cập nhật cài đặt thông báo', 'error'),
  });
}
