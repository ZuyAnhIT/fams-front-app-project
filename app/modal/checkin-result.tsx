import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { AuthGate } from '@/features/auth/components/AuthGate';
import { CheckinResult } from '@/features/checkin/components/CheckinResult';
import { palette } from '@/theme/tokens';

export default function CheckinResultModal() {
  const { checkinId, policy } = useLocalSearchParams<{
    checkinId: string;
    policy?: string;
  }>();
  const validCheckinId = typeof checkinId === 'string' ? checkinId.trim() : '';

  if (!validCheckinId) {
    const close = () => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/checkin-history');
    };
    return (
      <AuthGate>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <AppHeader title="Kết quả chấm công" onClose={close} />
          <FeedbackState
            icon="alert-circle-outline"
            title="Không thể mở kết quả chấm công"
            description="Liên kết không có mã bản ghi hợp lệ. Hãy mở lại từ lịch sử chấm công."
            actionLabel="Mở lịch sử chấm công"
            onAction={() => router.replace('/(tabs)/checkin-history')}
          />
        </SafeAreaView>
      </AuthGate>
    );
  }
  return (
    <AuthGate>
      <CheckinResult checkinId={validCheckinId} policy={policy} />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
});
