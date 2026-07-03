import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthTheme } from '@/features/auth/theme';

import { useFaceEnroll } from '../hooks/use-face-enroll';
import { FaceConsentSheet } from './FaceConsentSheet';
import { FaceEnrollCamera } from './FaceEnrollCamera';

export function FaceEnrollScreen() {
  const theme = useAuthTheme();
  const {
    step,
    consentVisible,
    isLoading,
    isSavingConsent,
    isRegistering,
    handleConsentConfirm,
    handleRegister,
    handleBack,
    goToProfile,
  } = useFaceEnroll();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'done') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={[styles.doneTitle, { color: theme.text }]}>Đăng ký Face ID thành công</Text>
          <Text style={[styles.doneDesc, { color: theme.textSecondary }]}>
            Bạn có thể sử dụng nhận diện khuôn mặt khi chấm công.
          </Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
            onPress={goToProfile}
          >
            <Text style={styles.btnPrimaryText}>Về Hồ sơ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={12}>
          <Text style={[styles.back, { color: theme.primary }]}>← Huỷ</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Đăng ký Face ID</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 'capture' && (
          <FaceEnrollCamera
            onComplete={handleRegister}
            onRegister={handleRegister}
            isRegistering={isRegistering}
          />
        )}
      </ScrollView>

      <FaceConsentSheet
        visible={consentVisible}
        onClose={handleBack}
        onConfirm={handleConsentConfirm}
        isLoading={isSavingConsent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { fontSize: 16, fontWeight: '600', width: 72 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 72 },
  scroll: { padding: 16, paddingBottom: 32 },
  doneWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  doneIcon: { fontSize: 56 },
  doneTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  doneDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btnPrimary: { marginTop: 16, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
