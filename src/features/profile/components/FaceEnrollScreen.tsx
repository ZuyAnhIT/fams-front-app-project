import { Ionicons } from '@expo/vector-icons';
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

import { useFaceEnroll } from '@/features/face/hooks/use-face-enroll';
import { requiresFaceIdReEnrollment } from '@/features/face/utils/face-id.utils';
import { FaceConsentSheet } from './FaceConsentSheet';
import { FaceEnrollCamera } from './FaceEnrollCamera';

export function FaceEnrollScreen() {
  const theme = useAuthTheme();
  const {
    step,
    consentVisible,
    isLoading,
    employeeId,
    faceIdStatus,
    hasApprovedFace,
    isStatusError,
    submitError,
    isSavingConsent,
    isRegistering,
    handleConsentConfirm,
    handleChallengePassed,
    handleBack,
    goToProfile,
    refetchStatus,
  } = useFaceEnroll();
  const needsModelUpgrade = requiresFaceIdReEnrollment(faceIdStatus);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!employeeId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.doneWrap}>
          <Text style={[styles.doneTitle, { color: theme.text }]}>
            Tài khoản này không có hồ sơ nhân viên, không thể dùng Face-ID
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

  if (isStatusError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.doneWrap}>
          <Ionicons name="cloud-offline-outline" size={52} color={theme.error} />
          <Text style={[styles.doneTitle, { color: theme.text }]}>
            Không thể kiểm tra trạng thái Face ID
          </Text>
          <Text style={[styles.doneDesc, { color: theme.textSecondary }]}>
            App chưa thể xác định hồ sơ hiện tại nên sẽ không mở camera hoặc thu
            thập thêm dữ liệu khuôn mặt.
          </Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
            onPress={() => void refetchStatus()}
          >
            <Text style={styles.btnPrimaryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'submitted') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: `${theme.primary}18` }]}>
            <Ionicons name="time-outline" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.doneTitle, { color: theme.text }]}>
            Đã gửi, đang chờ HR duyệt
          </Text>
          <Text style={[styles.doneDesc, { color: theme.textSecondary }]}>
            {needsModelUpgrade
              ? 'Hồ sơ cũ không tương thích với ArcFace 512 chiều. Hãy chờ hồ sơ mới được duyệt trước khi check-in bằng Face ID.'
              : hasApprovedFace
                ? 'Face ID hiện tại vẫn dùng được trong lúc chờ HR duyệt lượt đăng ký lại.'
              : 'Bạn chỉ có thể dùng Face ID để chấm công sau khi hồ sơ được HR hoặc quản lý phê duyệt.'}
          </Text>
          {faceIdStatus?.submittedAt && (
            <Text style={[styles.submittedAt, { color: theme.textMuted }]}>
              Gửi lúc {new Date(faceIdStatus.submittedAt).toLocaleString('vi-VN')}
            </Text>
          )}

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
        {step === 'capture' && employeeId && (
          <>
            {submitError && (
              <View style={[styles.errorCard, { backgroundColor: theme.errorBg }]}>
                <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{submitError}</Text>
              </View>
            )}
            <FaceEnrollCamera
              employeeId={employeeId}
              onPassed={handleChallengePassed}
              isRegistering={isRegistering}
            />
          </>
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
  doneIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  doneDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  submittedAt: { fontSize: 12, textAlign: 'center' },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  btnPrimary: { marginTop: 16, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
