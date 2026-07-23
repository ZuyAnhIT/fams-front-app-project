import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { NotificationList } from '@/features/notification/components/NotificationList';
import { useUnreadCount } from '@/features/notification/hooks/useUnreadCount';

export default function NotificationsScreen() {
  useUnreadCount();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Thông báo" subtitle="Cập nhật chấm công và phân công" />
      <NotificationList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
