import { Tabs } from 'expo-router';

import { useUnreadCount } from '@/features/notification/hooks/useUnreadCount';
import { useNotificationStore } from '@/features/notification/store/notificationStore';

export default function TabLayout() {
  useUnreadCount();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const tabBarBadge =
    unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="checkin" options={{ title: 'Chấm công' }} />
      <Tabs.Screen name="random-check" options={{ title: 'Kiểm tra' }} />
      <Tabs.Screen name="attendance" options={{ title: 'Công' }} />
      <Tabs.Screen name="assignment" options={{ title: 'Phân công' }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarBadge,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
    </Tabs>
  );
}
