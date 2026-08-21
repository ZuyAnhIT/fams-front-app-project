import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { AuthGate } from '@/features/auth/components/AuthGate';
import { RandomCheckResult } from '@/features/random-check/components/RandomCheckResult';
import { parseRandomCheckResultParams } from '@/features/random-check/utils/random-check-result-params';
import { palette } from '@/theme/tokens';

export default function RandomCheckResultModal() {
  const params = useLocalSearchParams<{
    checkId?: string;
    mode?: string;
    outcome?: string;
    failureReason?: string;
    locationVerified?: string;
    faceVerified?: string;
    livenessVerified?: string;
    score?: string;
    hasPhotoEvidence?: string;
    processing?: string;
  }>();
  const result = parseRandomCheckResultParams(params);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/random-check');
  };

  if (!result) {
    return (
      <AuthGate>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <AppHeader title="Kết quả kiểm tra" onClose={close} />
          <FeedbackState
            icon="alert-circle-outline"
            title="Không thể mở kết quả kiểm tra"
            description="Liên kết không đầy đủ hoặc đã bị thay đổi. Hãy quay lại danh sách kiểm tra để xem trạng thái mới nhất."
            actionLabel="Về danh sách kiểm tra"
            onAction={() => router.replace('/(tabs)/random-check')}
          />
        </SafeAreaView>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <RandomCheckResult {...result} />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
});
