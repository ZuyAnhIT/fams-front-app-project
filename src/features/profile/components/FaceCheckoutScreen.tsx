import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthTheme } from '@/features/auth/theme';
import { useCheckoutSubmit } from '@/features/checkin/hooks/use-checkout-submit';
import type { CheckinPolicy } from '@/features/checkin/types/checkin.type';
import { useCurrentEmployeeId } from '@/features/face/hooks/use-current-employee-id';
import { useFaceIdStatus } from '@/features/face/hooks/use-face-id';

import { FaceLivenessCamera } from './FaceLivenessCamera';
import { FacePhotoCapture } from './FacePhotoCapture';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function FaceCheckoutScreen() {
  const theme = useAuthTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    siteId?: string | string[];
    siteName?: string | string[];
    policy?: string | string[];
  }>();
  const siteId = firstParam(params.siteId);
  const siteName = firstParam(params.siteName);
  const policy: CheckinPolicy =
    firstParam(params.policy) === 'gps_face_liveness'
      ? 'gps_face_liveness'
      : 'gps_face';
  const { employeeId, isLoading: isLoadingEmployee } = useCurrentEmployeeId();
  const {
    faceIdStatus,
    isLoading: isLoadingFace,
    isError: isFaceStatusError,
    refetch: refetchFaceStatus,
  } = useFaceIdStatus(employeeId);
  const { checkOut, isLocating, isSubmitting, locationErrorMessage } =
    useCheckoutSubmit();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/checkin');
  };

  const finish = async (verification: {
    employeePhotoBase64?: string;
    livenessChallengeId?: string;
  }) => {
    setSubmitError(null);
    const attempt = await checkOut(verification);
    if (attempt.result) {
      router.replace({
        pathname: '/modal/checkin-result',
        params: { checkinId: attempt.result.id, policy },
      } as never);
      return;
    }
    if (attempt.alreadyCompleted) {
      router.replace('/(tabs)/checkin');
      return;
    }
    if (attempt.faceRequirement === 'not_enrolled') {
      router.replace('/face/enroll');
      return;
    }
    const message =
      locationErrorMessage ??
      'Chưa thể ghi nhận ra ca. Vui lòng thực hiện xác minh mới và thử lại.';
    setSubmitError(message);
    throw new Error(message);
  };

  const isLoading = isLoadingEmployee || (!!employeeId && isLoadingFace);
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textMuted }}>Đang kiểm tra Face ID...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (employeeId && isFaceStatusError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Xác thực ra ca</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={58} color={theme.error} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Không thể kiểm tra Face ID
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Camera chưa được mở để tránh thu dữ liệu khuôn mặt khi trạng thái hồ
            sơ chưa được xác định.
          </Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => void refetchFaceStatus()}
          >
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!siteId || !employeeId || faceIdStatus?.status !== 'enrolled') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Xác thực ra ca
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={58} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Không đủ điều kiện xác thực Face ID
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Cần hồ sơ Face ID đã được duyệt và thông tin công trình hợp lệ.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Xác thực ra ca
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.siteCard, { backgroundColor: theme.card }]}>
          <Ionicons name="business-outline" size={22} color={theme.primary} />
          <View>
            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
              Công trình
            </Text>
            <Text style={[styles.siteName, { color: theme.text }]}>
              {siteName || siteId}
            </Text>
          </View>
        </View>
        {submitError && (
          <View style={[styles.errorCard, { backgroundColor: theme.errorBg }]}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>
              {submitError}
            </Text>
          </View>
        )}
        {policy === 'gps_face_liveness' ? (
          <FaceLivenessCamera
            employeeId={employeeId}
            purpose="checkout"
            siteId={siteId}
            onPassed={(challengeId) => finish({ livenessChallengeId: challengeId })}
            isFinalizing={isLocating || isSubmitting}
          />
        ) : (
          <FacePhotoCapture
            onSubmit={(employeePhotoBase64) => finish({ employeePhotoBase64 })}
            isSubmitting={isLocating || isSubmitting}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 24 },
  scroll: { padding: 16, paddingBottom: 36, gap: 14 },
  siteCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  siteName: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
  emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  errorCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  primaryButton: {
    marginTop: 8,
    borderRadius: 13,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
