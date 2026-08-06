import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { NotificationList } from '@/features/notification/components/NotificationList';
import { useUnreadCount } from '@/features/notification/hooks/useUnreadCount';
import { palette } from '@/theme/tokens';

export default function NotificationsScreen() {
  useUnreadCount();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Thông báo" subtitle="Cập nhật chấm công và phân công" right={<Pressable onPress={() => router.push('/notification-settings' as never)} style={styles.settingsButton} accessibilityRole="button" accessibilityLabel="Mở cài đặt thông báo"><Ionicons name="settings-outline" size={22} color={palette.text} /></Pressable>} />
      <NotificationList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  settingsButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
