import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/features/auth/store';
import { useUnreadCount } from '@/features/notification/hooks/useUnreadCount';
import { palette } from '@/theme/tokens';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(outline: IoniconName, filled: IoniconName) {
  return function TabBarIcon({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
  };
}

export default function TabLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const { unreadCount } = useUnreadCount();

  if (isHydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const tabBarBadge =
    unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
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
        options={{ href: null }}
      />
      <Tabs.Screen
        name="attendance"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="assignment"
        options={{ href: null }}
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
      <Tabs.Screen name="checkin-history" options={{ href: null }} />
      <Tabs.Screen name="sessions" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    backgroundColor: palette.surface,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 62,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
