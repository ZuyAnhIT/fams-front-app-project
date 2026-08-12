import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackState } from '@/components/ui/feedback-state';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { useFaceIdStatus } from '@/features/face/hooks/use-face-id';
import { useGps } from '@/features/gps/hooks/use-gps';
import { FacePhotoCapture } from '@/features/profile/components/FacePhotoCapture';
import { palette, radius, shadows, spacing } from '@/theme/tokens';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';

import { useMyPendingRandomChecks, useSubmitRandomCheck } from '../hooks/use-random-check';
import type { EmployeePendingCheck, RandomCheckMode } from '../types/random-check.type';
import {
  getRandomCheckMode,
  isRandomCheckProcessing,
  RANDOM_CHECK_MODE_LABELS,
  randomCheckRequiresFace,
  randomCheckRequiresLiveness,
  secondsLeft,
} from '../utils/random-check.utils';

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function CheckCard({
  item,
  now,
  selected,
  onSelect,
  syncedAt,
  formatDateTime,
}: {
  item: EmployeePendingCheck;
  now: number;
  selected: boolean;
  onSelect: () => void;
  syncedAt: number;
  formatDateTime: (value: string) => string;
}) {
  const mode = getRandomCheckMode(item.configSnapshot);
  const remaining = secondsLeft(item, now, syncedAt);
  const actionable = item.status === 'sent' && remaining > 0;

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <View style={[styles.modeIcon, actionable && styles.modeIconUrgent]}>
          <Ionicons
            name={randomCheckRequiresLiveness(mode) ? 'scan-outline' : randomCheckRequiresFace(mode) ? 'camera-outline' : 'location-outline'}
            size={21}
            color={actionable ? palette.danger : palette.primary}
          />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>Lần kiểm tra #{item.checkIndex}</Text>
          <Text style={styles.cardMeta}>{RANDOM_CHECK_MODE_LABELS[mode]}</Text>
        </View>
        {item.status === 'sent' ? (
          <View style={[styles.countdown, remaining === 0 && styles.expiredPill]}>
            <Text style={[styles.countdownText, remaining === 0 && styles.expiredText]}>
              {remaining > 0 ? formatCountdown(remaining) : 'Hết hạn'}
            </Text>
          </View>
        ) : (
          <View style={styles.pendingPill}><Text style={styles.pendingText}>Sắp tới</Text></View>
        )}
      </View>
      <View style={styles.metaLine}>
        <Ionicons name="time-outline" size={15} color={palette.textMuted} />
        <Text style={styles.metaText}>
          {item.status === 'sent' && item.expiresAt
            ? `Phản hồi trước ${formatDateTime(item.expiresAt)}`
            : `Dự kiến ${formatDateTime(item.scheduledAt)}`}
        </Text>
      </View>
      {actionable && (
        <Pressable
          onPress={onSelect}
          style={({ pressed }) => [styles.respondButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Phản hồi lần kiểm tra ${item.checkIndex}`}
        >
          <Text style={styles.respondButtonText}>{selected ? 'Đang mở phản hồi' : 'Phản hồi ngay'}</Text>
          <Ionicons name="arrow-forward" size={18} color={palette.white} />
        </Pressable>
      )}
    </View>
  );
}

export function RandomCheckScreen() {
  const { formatDateTime } = useTenantPreferences();
  const params = useLocalSearchParams<{ checkId?: string }>();
  const [now, setNow] = useState(Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handledDeepLinkRef = useRef<string | null>(null);
  const query = useMyPendingRandomChecks();
  const submission = useSubmitRandomCheck();
  const gps = useGps();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const checks = useMemo(
    // Future pending checks must stay undisclosed or the employee can predict
    // a supposedly random spot check. Only dispatched checks are actionable.
    () => query.checks
      .filter((item) => item.status === 'sent')
      .sort((a, b) => new Date(a.expiresAt ?? 0).getTime() - new Date(b.expiresAt ?? 0).getTime()),
    [query.checks],
  );
  const selected = checks.find((item) => item.id === selectedId) ?? null;
  const selectedMode: RandomCheckMode = selected
    ? getRandomCheckMode(selected.configSnapshot)
    : 'location_only';
  const face = useFaceIdStatus(selected?.employeeId ?? null);
  const selectedExpired = selected
    ? secondsLeft(selected, now, query.dataUpdatedAt) <= 0
    : false;

  useEffect(() => {
    if (selected && (selected.status !== 'sent' || selectedExpired)) setSelectedId(null);
  }, [selected, selectedExpired]);

  useEffect(() => {
    const target = params.checkId;
    if (
      !target ||
      query.isLoading ||
      query.isFetching ||
      handledDeepLinkRef.current === target
    ) return;
    const matchingCheck = checks.find(
      (item) =>
        item.id === target &&
        item.status === 'sent' &&
        secondsLeft(item, Date.now(), query.dataUpdatedAt) > 0,
    );
    if (matchingCheck) {
      handledDeepLinkRef.current = target;
      setSelectedId(matchingCheck.id);
    }
  }, [checks, params.checkId, query.dataUpdatedAt, query.isFetching, query.isLoading]);

  const send = async (employeePhotoBase64?: string) => {
    if (!selected || selectedExpired) return;
    const coords = await gps.requestLocation();
    if (!coords) return;
    if (secondsLeft(selected, Date.now(), query.dataUpdatedAt) <= 0) {
      setSelectedId(null);
      await query.refetch();
      return;
    }
    try {
      const response = await submission.submit({
        checkId: selected.id,
        payload: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy ?? undefined,
          employeePhotoBase64,
        },
      });
      const processing = isRandomCheckProcessing(selectedMode, response);
      router.push({
        pathname: '/modal/random-check-result',
        params: {
          checkId: selected.id,
          mode: selectedMode,
          outcome: response.outcome,
          failureReason: response.failureReason ?? '',
          locationVerified: String(response.locationVerified),
          faceVerified: response.faceVerified === null ? 'pending' : String(response.faceVerified),
          livenessVerified: response.livenessVerified === null ? 'pending' : String(response.livenessVerified),
          score: response.faceVerifyScore === null ? '' : String(response.faceVerifyScore),
          hasPhotoEvidence: String(response.hasPhotoEvidence),
          processing: String(processing),
        },
      });
    } catch {
      // Mutation presents the backend business message and keeps the form open.
    }
  };

  const faceReady = face.faceIdStatus?.status === 'enrolled' && !face.faceIdStatus.requiresReEnrollment;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Kiểm tra ngẫu nhiên</Text>
        <Text style={styles.subtitle}>Phản hồi yêu cầu kiểm tra trong thời gian quy định</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={palette.primary} />}
      >
        <ResponsiveContainer>
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={22} color={palette.primary} />
            <Text style={styles.infoText}>
              Policy do công ty và công trình quy định. Ứng dụng chỉ gửi GPS/ảnh cần thiết; kết quả cuối do máy chủ xác minh.
            </Text>
          </View>

          {query.isLoading ? (
            <View style={styles.loading}><ActivityIndicator size="large" color={palette.primary} /><Text style={styles.muted}>Đang kiểm tra yêu cầu...</Text></View>
          ) : query.isError ? (
            <FeedbackState icon="cloud-offline-outline" title="Không thể tải yêu cầu kiểm tra" description="Kiểm tra mạng hoặc công ty đang chọn rồi thử lại." actionLabel="Thử lại" onAction={() => void query.refetch()} />
          ) : checks.length === 0 ? (
            <FeedbackState icon="checkmark-done-circle-outline" title="Không có yêu cầu đang chờ" description="Khi công ty gửi kiểm tra, thông báo và yêu cầu phản hồi sẽ xuất hiện tại đây." />
          ) : (
            <View style={styles.list}>
              {checks.map((item) => (
                <CheckCard
                  key={item.id}
                  item={item}
                  now={now}
                  syncedAt={query.dataUpdatedAt}
                  formatDateTime={formatDateTime}
                  selected={item.id === selectedId}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </View>
          )}

          {selected && !selectedExpired && (
            <View style={styles.responsePanel}>
              <Text style={styles.panelEyebrow}>PHẢN HỒI #{selected.checkIndex}</Text>
              <Text style={styles.panelTitle}>{RANDOM_CHECK_MODE_LABELS[selectedMode]}</Text>
              <Text style={styles.panelDescription}>
                Bật định vị chính xác và thực hiện ngay tại công trình. Không dùng ảnh từ thư viện.
              </Text>

              {randomCheckRequiresFace(selectedMode) ? (
                face.isLoading ? (
                  <ActivityIndicator style={styles.panelLoader} color={palette.primary} />
                ) : !faceReady ? (
                  <View style={styles.faceWarning} accessibilityRole="alert">
                    <Ionicons name="person-circle-outline" size={24} color={palette.warning} />
                    <View style={styles.warningCopy}>
                      <Text style={styles.warningTitle}>Face ID chưa sẵn sàng</Text>
                      <Text style={styles.warningText}>
                        {face.faceIdStatus?.requiresReEnrollment
                          ? 'Hồ sơ khuôn mặt cũ cần đăng ký lại theo mô hình nhận diện mới.'
                          : face.faceIdStatus?.reviewStatus === 'pending'
                            ? 'Hồ sơ đang chờ HR duyệt; bạn chưa thể phản hồi mode có khuôn mặt.'
                            : 'Hãy đăng ký và chờ HR duyệt Face ID trước khi phản hồi.'}
                      </Text>
                      <Pressable onPress={() => router.push('/face/enroll')} style={styles.linkButton} accessibilityRole="button">
                        <Text style={styles.linkText}>Mở đăng ký Face ID</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <FacePhotoCapture onSubmit={send} isSubmitting={submission.isSubmitting || gps.isLocating} />
                )
              ) : (
                <Pressable
                  disabled={submission.isSubmitting || gps.isLocating}
                  onPress={() => void send()}
                  style={({ pressed }) => [styles.locationButton, pressed && styles.pressed, (submission.isSubmitting || gps.isLocating) && styles.disabled]}
                  accessibilityRole="button"
                  accessibilityState={{ busy: submission.isSubmitting || gps.isLocating }}
                >
                  {submission.isSubmitting || gps.isLocating ? <ActivityIndicator color={palette.white} /> : <Ionicons name="navigate" size={20} color={palette.white} />}
                  <Text style={styles.locationButtonText}>{gps.isLocating ? 'Đang lấy vị trí...' : 'Xác minh vị trí và gửi'}</Text>
                </Pressable>
              )}
              {gps.errorMessage && <Text style={styles.locationError}>{gps.errorMessage}</Text>}
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  header: { minHeight: 70, justifyContent: 'center', paddingHorizontal: spacing.xl, backgroundColor: palette.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  title: { color: palette.text, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: palette.surfaceBrand, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  infoText: { flex: 1, color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  loading: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  muted: { color: palette.textMuted, fontSize: 13 },
  list: { gap: spacing.md },
  card: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  cardSelected: { borderColor: palette.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modeIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: palette.surfaceBrand, alignItems: 'center', justifyContent: 'center' },
  modeIconUrgent: { backgroundColor: palette.dangerSoft },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: palette.text, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  cardMeta: { color: palette.textMuted, fontSize: 11, lineHeight: 17 },
  countdown: { backgroundColor: palette.dangerSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  countdownText: { color: palette.danger, fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  expiredPill: { backgroundColor: palette.surfaceMuted },
  expiredText: { color: palette.textMuted },
  pendingPill: { backgroundColor: palette.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pendingText: { color: palette.primary, fontSize: 11, fontWeight: '800' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  metaText: { color: palette.textMuted, fontSize: 11, lineHeight: 17 },
  respondButton: { minHeight: 46, marginTop: spacing.lg, borderRadius: radius.md, backgroundColor: palette.danger, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  respondButtonText: { color: palette.white, fontSize: 14, fontWeight: '800' },
  responsePanel: { marginTop: spacing.xl, backgroundColor: palette.surface, borderRadius: radius.xl, padding: spacing.xl, ...shadows.card },
  panelEyebrow: { color: palette.primary, fontSize: 11, lineHeight: 16, fontWeight: '900', letterSpacing: 0.6 },
  panelTitle: { color: palette.text, fontSize: 21, lineHeight: 28, fontWeight: '900', marginTop: spacing.xs },
  panelDescription: { color: palette.textMuted, fontSize: 13, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.lg },
  panelLoader: { marginVertical: spacing.xxl },
  faceWarning: { flexDirection: 'row', gap: spacing.md, backgroundColor: palette.warningSoft, borderRadius: radius.lg, padding: spacing.lg },
  warningCopy: { flex: 1 },
  warningTitle: { color: palette.warning, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  warningText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  linkButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { color: palette.primary, fontSize: 13, fontWeight: '800' },
  locationButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: palette.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  locationButtonText: { color: palette.white, fontSize: 14, fontWeight: '800' },
  locationError: { color: palette.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.78 },
});
