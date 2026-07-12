import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useUnreadCount } from '@/features/notification/hooks/useUnreadCount';
import { useNotificationStore } from '@/features/notification/store/notificationStore';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(outline: IoniconName, filled: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}

export default function TabLayout() {
  useUnreadCount();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const tabBarBadge =
    unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{ title: 'Trang chủ', tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="checkin"
        options={{ title: 'Chấm công', tabBarIcon: tabIcon('finger-print-outline', 'finger-print') }}
      />
      <Tabs.Screen
        name="random-check"
        options={{ title: 'Kiểm tra', tabBarIcon: tabIcon('shuffle-outline', 'shuffle') }}
      />
      <Tabs.Screen
        name="attendance"
        options={{ title: 'Công', tabBarIcon: tabIcon('calendar-outline', 'calendar') }}
      />
      <Tabs.Screen
        name="assignment"
        options={{ title: 'Phân công', tabBarIcon: tabIcon('clipboard-outline', 'clipboard') }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarBadge,
          tabBarIcon: tabIcon('notifications-outline', 'notifications'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Hồ sơ', tabBarIcon: tabIcon('person-outline', 'person') }}
      />

      {/* Reachable via router.push, kept inside the tabs navigator so the
          tab bar stays visible; hidden from the tab bar itself via href:null.
          "site" and "assignment" are nested Stack navigators (see their
          _layout.tsx) so list->detail keeps native swipe-back. */}
      <Tabs.Screen name="site" options={{ href: null }} />
      <Tabs.Screen name="notification/index" options={{ href: null }} />
    </Tabs>
  );
}
