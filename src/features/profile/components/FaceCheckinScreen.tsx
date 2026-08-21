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
import { useCheckinSubmit } from '@/features/checkin/hooks/use-checkin-submit';
import type { CheckinPolicy } from '@/features/checkin/types/checkin.type';
import { useCurrentEmployeeId } from '@/features/face/hooks/use-current-employee-id';
import { useFaceIdStatus } from '@/features/face/hooks/use-face-id';
import { requiresFaceIdReEnrollment } from '@/features/face/utils/face-id.utils';

import { FaceLivenessCamera } from './FaceLivenessCamera';
import { FacePhotoCapture } from './FacePhotoCapture';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function FaceCheckinScreen() {
  const theme = useAuthTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    siteId?: string | string[];
    siteName?: string | string[];
    assignmentId?: string | string[];
    policy?: string | string[];
    offline?: string | string[];
  }>();
  const siteId = firstParam(params.siteId);
  const siteName = firstParam(params.siteName);
  const assignmentId = firstParam(params.assignmentId);
  const policyParam = firstParam(params.policy);
  const policy: CheckinPolicy =
    policyParam === 'gps_face_liveness' ? 'gps_face_liveness' : 'gps_face';
  const offline = firstParam(params.offline) === 'true';
  const { employeeId, isLoading: isLoadingEmployee } = useCurrentEmployeeId();
  const {
    faceIdStatus,
    isLoading: isLoadingFace,
    isError: isFaceStatusError,
    refetch: refetchFaceStatus,
  } = useFaceIdStatus(employeeId);
  const {
    checkIn,
    isLocating,
    isSubmitting,
    locationErrorMessage,
  } = useCheckinSubmit();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/checkin');
  };

  const isLoading = isLoadingEmployee || (!!employeeId && isLoadingFace);
  const hasApprovedFace = faceIdStatus?.status === 'enrolled';
  const needsModelUpgrade = requiresFaceIdReEnrollment(faceIdStatus);

  const handlePassed = async (challengeId: string) => {
    setSubmitError(null);
    const attempt = await checkIn(siteId, {
      assignmentId,
      siteName,
      effectiveCheckinPolicy: policy,
      livenessChallengeId: challengeId,
    });
    if (attempt.result) {
      router.replace({
        pathname: '/modal/checkin-result',
        params: { checkinId: attempt.result.id, policy },
      } as never);
      return;
    }

    if (attempt.faceRequirement === 'not_enrolled') {
      router.replace('/face/enroll');
      return;
    }
    if (attempt.faceRequirement === 'required') {
      const message =
        'Phiên xác thực không còn hợp lệ hoặc không đúng công trình. Vui lòng thực hiện một thử thách mới ngay tại đây.';
      setSubmitError(message);
      throw new Error(message);
    }

    const message =
      locationErrorMessage ??
      'Thử thách đã đạt nhưng chưa ghi nhận được chấm công. Vui lòng thử lại.';
    setSubmitError(message);
    throw new Error(message);
  };

  const handlePhoto = async (employeePhotoBase64: string) => {
    setSubmitError(null);
    const attempt = await checkIn(siteId, {
      assignmentId,
      siteName,
      effectiveCheckinPolicy: policy,
      employeePhotoBase64,
    });
    if (attempt.result) {
      router.replace({
        pathname: '/modal/checkin-result',
        params: { checkinId: attempt.result.id, policy },
      } as never);
      return;
    }
    if (attempt.queuedOffline) {
      router.replace('/(tabs)/checkin');
      return;
    }
    if (attempt.faceRequirement === 'not_enrolled') {
      router.replace('/face/enroll');
      return;
    }
    if (
      attempt.faceRequirement === 'required' &&
      policy === 'gps_face_liveness'
    ) {
      router.replace({
        pathname: '/face/checkin',
        params: {
          siteId,
          siteName,
          assignmentId,
          policy,
          offline: 'false',
        },
      } as never);
      return;
    }
    setSubmitError(
      locationErrorMessage ??
        'Chưa ghi nhận được chấm công. Vui lòng kiểm tra mạng và thử lại.',
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Đang kiểm tra trạng thái Face ID...
          </Text>
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Xác thực chấm công
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.empty}>
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

  if (!siteId || !employeeId || !hasApprovedFace || needsModelUpgrade) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Xác thực chấm công
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.empty}>
          <Ionicons
            name="person-circle-outline"
            size={58}
            color={theme.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {!employeeId
              ? 'Không tìm thấy hồ sơ nhân viên'
              : !siteId
                ? 'Thiếu thông tin công trình'
                : needsModelUpgrade
                  ? 'Face ID cần được đăng ký lại'
                : 'Face ID chưa được phê duyệt'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {needsModelUpgrade
              ? 'Hồ sơ cũ không tương thích với ArcFace 512 chiều. Hãy đăng ký lại và chờ HR duyệt trước khi check-in.'
              : 'Công trình này yêu cầu Face ID đã được duyệt trước khi chấm công.'}
          </Text>
          {employeeId && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => router.replace('/face/enroll')}
            >
              <Text style={styles.primaryButtonText}>
                {faceIdStatus?.reviewStatus === 'pending'
                  ? 'Xem trạng thái chờ duyệt'
                  : needsModelUpgrade
                    ? 'Nâng cấp Face ID'
                    : 'Đăng ký Face ID'}
              </Text>
            </Pressable>
          )}
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
          Xác thực chấm công
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.siteCard, { backgroundColor: theme.card }]}>
          <Ionicons name="business-outline" size={22} color={theme.primary} />
          <View style={styles.siteCopy}>
            <Text style={[styles.siteLabel, { color: theme.textMuted }]}>
              Công trình yêu cầu Face ID
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
        {policy === 'gps_face_liveness' && !offline ? (
          <FaceLivenessCamera
            employeeId={employeeId}
            purpose="checkin"
            siteId={siteId}
            onPassed={handlePassed}
            isFinalizing={isLocating || isSubmitting}
          />
        ) : (
          <FacePhotoCapture
            onSubmit={handlePhoto}
            isSubmitting={isLocating || isSubmitting}
            offlineReviewNotice={offline && policy === 'gps_face_liveness'}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
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
  siteCopy: { flex: 1 },
  siteLabel: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
  siteName: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
  errorCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  empty: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primaryButton: {
    marginTop: 8,
    borderRadius: 13,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
