import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { NotificationSettings } from '@/features/notification/components/NotificationSettings';
import { palette } from '@/theme/tokens';

export default function NotificationSettingsScreen() {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/notifications');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Cài đặt thông báo" subtitle="Chọn riêng hộp thư và push" onBack={goBack} />
      <NotificationSettings />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: palette.canvas } });
