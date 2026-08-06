import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useToast } from '@/components/ui/toast';

import { getNotificationSettings, updateNotificationSetting } from '../services/notification.service';
import type { NotificationSetting, UpdateNotificationSettingRequest } from '../types/Notification';

export const notificationSettingKeys = {
  all: ['notification-settings'] as const,
};

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationSettingKeys.all,
    queryFn: getNotificationSettings,
  });
}

function notificationSettingErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'Không thể cập nhật cài đặt thông báo';
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (typeof data?.userMessage === 'string' && data.userMessage.trim()) {
    return data.userMessage;
  }
  if (error.response?.status === 403) {
    return 'Bạn không có quyền thay đổi cài đặt thông báo này.';
  }
  if (!error.response) return 'Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.';
  return 'Không thể cập nhật cài đặt thông báo';
}

export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ eventType, request }: { eventType: string; request: UpdateNotificationSettingRequest }) =>
      updateNotificationSetting(eventType, request),
    onMutate: async ({ eventType, request }) => {
      await queryClient.cancelQueries({ queryKey: notificationSettingKeys.all });
      const previous = queryClient.getQueryData<NotificationSetting[]>(
        notificationSettingKeys.all,
      );
      queryClient.setQueryData<NotificationSetting[]>(
        notificationSettingKeys.all,
        (current = []) => current.map((setting) => (
          setting.eventType === eventType
            ? { ...setting, ...request, customized: true }
            : setting
        )),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationSettingKeys.all, context.previous);
      }
      showToast(notificationSettingErrorMessage(error), 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationSettingKeys.all });
    },
  });
}
