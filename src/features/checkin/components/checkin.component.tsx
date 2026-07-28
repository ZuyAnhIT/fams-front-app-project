import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { AppButton } from '@/components/ui/app-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FeedbackState } from '@/components/ui/feedback-state';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { useProfile } from '@/features/auth/hooks/use-profile';
import { useAuthStore } from '@/features/auth/store';
import { palette, radius, shadows, spacing } from '@/theme/tokens';

import { useAvailableSites } from '../hooks/use-available-sites';
import { useCheckinSubmit } from '../hooks/use-checkin-submit';
import { useCheckoutSubmit } from '../hooks/use-checkout-submit';
import { useCheckinStore } from '../store/checkin.store';
import type {
  AvailableSite,
  CheckinAvailabilityStatus,
} from '../types/checkin.type';
import {
  ASSIGNMENT_ROLE_LABELS,
  AVAILABILITY_LABELS,
  canCheckinAtSite,
  formatAvailableSiteSchedule,
  getAvailabilityDescription,
  getEffectiveAvailabilityStatus,
  parseCheckinError,
} from '../utils/available-site';

const AVAILABILITY_COLORS: Record<
  CheckinAvailabilityStatus,
  { background: string; text: string; border: string }
> = {
  unrestricted: {
    background: palette.primarySoft,
    text: palette.primary,
    border: '#BFDBFE',
  },
  upcoming: {
    background: palette.warningSoft,
    text: palette.warning,
    border: '#FDE68A',
  },
  open: {
    background: palette.successSoft,
    text: palette.success,
    border: '#BBF7D0',
  },
  closed: {
    background: palette.surfaceMuted,
    text: palette.textMuted,
    border: palette.border,
  },
};

function currentTimeLabel(now: Date): string {
  return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function currentDateLabel(now: Date): string {
  return now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Primary employee attendance experience: one clear action based on shift state. */
export function CheckinHome() {
  const router = useRouter();
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const { profile, isLoading: isLoadingProfile, isError: isProfileError } = useProfile();
  const {
    sites,
    isLoading,
    isRefetching,
    isError,
    isForbidden,
    error,
    dataUpdatedAt,
    refetch,
  } = useAvailableSites();
  const {
    checkIn,
    isLocating: isLocatingIn,
    isSubmitting: isSubmittingIn,
    locationErrorMessage: errIn,
  } = useCheckinSubmit();
  const {
    checkOut,
    isLocating: isLocatingOut,
    isResolvingOpenCheckin,
    isSubmitting: isSubmittingOut,
    locationErrorMessage: errOut,
    openCheckinId,
  } = useCheckoutSubmit();

  const hydrate = useCheckinStore((state) => state.hydrate);
  const isHydrating = useCheckinStore((state) => state.isHydrating);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [checkoutConfirmVisible, setCheckoutConfirmVisible] = useState(false);

  useEffect(() => {
    if (!isLoadingProfile) {
      void hydrate(profile?.id ?? null, tenantId);
    }
  }, [hydrate, isLoadingProfile, profile?.id, tenantId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) return;

    const actionableSites = sites.filter((site) =>
      canCheckinAtSite(
        getEffectiveAvailabilityStatus(site, now.getTime(), dataUpdatedAt),
      ),
    );
    if (actionableSites.length === 1) {
      setSelectedAssignmentId(actionableSites[0].assignmentId);
    } else if (sites.length === 1) {
      setSelectedAssignmentId(sites[0].assignmentId);
    }
  }, [dataUpdatedAt, now, selectedAssignmentId, sites]);

  useEffect(() => {
    if (
      selectedAssignmentId &&
      !sites.some((item) => item.assignmentId === selectedAssignmentId)
    ) {
      setSelectedAssignmentId(null);
    }
  }, [selectedAssignmentId, sites]);

  const selectedSite = useMemo(
    () => sites.find((item) => item.assignmentId === selectedAssignmentId),
    [selectedAssignmentId, sites],
  );
  const selectedAvailabilityStatus = selectedSite
    ? getEffectiveAvailabilityStatus(
        selectedSite,
        now.getTime(),
        dataUpdatedAt,
      )
    : null;
  const canCheckinSelectedSite =
    selectedAvailabilityStatus !== null &&
    canCheckinAtSite(selectedAvailabilityStatus);
  const hasOpenShift = !!openCheckinId;
  const isCheckingState = isHydrating || isResolvingOpenCheckin;
  const isActionPending = isLocatingIn || isSubmittingIn || isLocatingOut || isSubmittingOut;
  const locationError = errIn ?? errOut;

  const goToResult = (checkinId: string) => {
    router.push({ pathname: '/modal/checkin-result', params: { checkinId } } as never);
  };

  const handleCheckin = async () => {
    if (!selectedSite || isCheckingState) return;
    const result = await checkIn(selectedSite.site.id);
    if (result) goToResult(result.id);
  };

  const handleCheckout = async () => {
    const result = await checkOut();
    setCheckoutConfirmVisible(false);
    if (result) {
      goToResult(result.id);
    }
  };

  if (isLoadingProfile || isHydrating || isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị thông tin chấm công...</Text>
      </SafeAreaView>
    );
  }

  if (isProfileError || !profile) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FeedbackState
          icon="person-circle-outline"
          title="Không thể xác định tài khoản chấm công"
          description="Vui lòng tải lại hồ sơ hoặc đăng nhập lại nếu tình trạng tiếp diễn."
        />
      </SafeAreaView>
    );
  }

  if (isForbidden) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FeedbackState
          icon="lock-closed-outline"
          title="Bạn chưa được cấp quyền chấm công"
          description="Liên hệ quản lý hoặc bộ phận nhân sự để kiểm tra phân quyền."
        />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể tải dữ liệu chấm công"
          description={parseCheckinError(error, 'Kiểm tra kết nối mạng rồi thử lại.')}
          actionLabel="Thử lại"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  const actionLabel = hasOpenShift
    ? isActionPending
      ? 'Đang ghi nhận check-out'
      : 'Kết thúc ca làm việc'
    : isActionPending
      ? 'Đang xác thực vị trí'
      : selectedAvailabilityStatus === 'upcoming'
        ? 'Chưa đến giờ chấm công'
        : selectedAvailabilityStatus === 'closed'
          ? 'Ca đã kết thúc'
          : 'Bắt đầu ca làm việc';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={palette.primary}
          />
        }
      >
        <ResponsiveContainer>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Chấm công</Text>
            <Text style={styles.subtitle}>Vị trí GPS sẽ được xác thực khi bạn thực hiện thao tác.</Text>
          </View>

          <View style={[styles.clockCard, hasOpenShift && styles.clockCardActive]}>
            <View style={styles.clockTopRow}>
              <View>
                <Text style={styles.clock}>{currentTimeLabel(now)}</Text>
                <Text style={styles.date}>{currentDateLabel(now)}</Text>
              </View>
              <View style={[styles.statusPill, hasOpenShift ? styles.statusPillActive : styles.statusPillIdle]}>
                <View style={[styles.statusDot, { backgroundColor: hasOpenShift ? palette.success : palette.textMuted }]} />
                <Text style={[styles.statusText, { color: hasOpenShift ? palette.success : palette.textSecondary }]}>
                  {hasOpenShift ? 'Đang trong ca' : 'Chưa bắt đầu ca'}
                </Text>
              </View>
            </View>

            {hasOpenShift ? (
              <View style={styles.activeShiftNotice}>
                <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                <Text style={styles.activeShiftText}>
                  Check-in đã được ghi nhận. Khi kết thúc công việc, hãy check-out tại vị trí hiện tại.
                </Text>
              </View>
            ) : isCheckingState ? (
              <View style={styles.activeShiftNotice}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text style={styles.activeShiftText}>Đang đối chiếu ca làm việc gần nhất...</Text>
              </View>
            ) : null}
          </View>

          {!hasOpenShift && !isCheckingState && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Chọn nơi làm việc</Text>
                  <Text style={styles.sectionSubtitle}>Chỉ hiển thị các công trình bạn được phân công hôm nay.</Text>
                </View>
                <Text style={styles.countLabel}>{sites.length} địa điểm</Text>
              </View>

              {sites.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="location-outline" size={28} color={palette.textMuted} />
                  <Text style={styles.emptyTitle}>Chưa có nơi làm việc phù hợp</Text>
                  <Text style={styles.emptyDescription}>Kiểm tra lại phân công hoặc liên hệ quản lý của bạn.</Text>
                </View>
              ) : (
                <View style={styles.siteList}>
                  {sites.map((item: AvailableSite) => {
                    const active = selectedAssignmentId === item.assignmentId;
                    const availabilityStatus = getEffectiveAvailabilityStatus(
                      item,
                      now.getTime(),
                      dataUpdatedAt,
                    );
                    const availabilityColors =
                      AVAILABILITY_COLORS[availabilityStatus];
                    const availabilityDescription = getAvailabilityDescription(
                      item,
                      availabilityStatus,
                      now.getTime(),
                      dataUpdatedAt,
                    );
                    return (
                      <Pressable
                        key={item.assignmentId}
                        onPress={() => setSelectedAssignmentId(item.assignmentId)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${item.site.name}, ${formatAvailableSiteSchedule(item)}, ${availabilityDescription}`}
                        style={({ pressed }) => [
                          styles.siteCard,
                          {
                            borderColor: availabilityColors.border,
                            opacity: availabilityStatus === 'closed' ? 0.72 : 1,
                          },
                          active && styles.siteCardActive,
                          pressed && styles.siteCardPressed,
                        ]}
                      >
                        <View style={[styles.radio, active && styles.radioActive]}>
                          {active && <Ionicons name="checkmark" size={14} color={palette.white} />}
                        </View>
                        <View style={styles.siteCopy}>
                          <View style={styles.siteTitleRow}>
                            <Text style={styles.siteName}>{item.site.name}</Text>
                            <View
                              style={[
                                styles.availabilityBadge,
                                { backgroundColor: availabilityColors.background },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.availabilityBadgeText,
                                  { color: availabilityColors.text },
                                ]}
                              >
                                {AVAILABILITY_LABELS[availabilityStatus]}
                              </Text>
                            </View>
                          </View>
                          {item.site.address && <Text style={styles.siteAddress} numberOfLines={2}>{item.site.address}</Text>}
                          <View style={styles.availabilityRow}>
                            <Ionicons
                              name={
                                availabilityStatus === 'open' ||
                                availabilityStatus === 'unrestricted'
                                  ? 'checkmark-circle-outline'
                                  : availabilityStatus === 'upcoming'
                                    ? 'hourglass-outline'
                                    : 'close-circle-outline'
                              }
                              size={15}
                              color={availabilityColors.text}
                            />
                            <Text
                              style={[
                                styles.availabilityText,
                                { color: availabilityColors.text },
                              ]}
                            >
                              {availabilityDescription}
                            </Text>
                          </View>
                          <View style={styles.siteMetaRow}>
                            <View style={styles.siteMeta}>
                              <Ionicons name="time-outline" size={14} color={palette.primary} />
                              <Text style={styles.siteMetaText}>
                                {formatAvailableSiteSchedule(item)}
                              </Text>
                            </View>
                            <View style={styles.siteMeta}>
                              <Ionicons name="person-outline" size={14} color={palette.primary} />
                              <Text style={styles.siteMetaText}>
                                {ASSIGNMENT_ROLE_LABELS[item.assignmentRole]}
                              </Text>
                            </View>
                            {item.geofence && (
                              <View style={styles.siteMeta}>
                                <Ionicons name="navigate-outline" size={14} color={palette.primary} />
                                <Text style={styles.siteMetaText}>Bán kính {item.geofence.bufferMeters} m</Text>
                              </View>
                            )}
                            {!item.geofence && (
                              <View style={styles.siteMeta}>
                                <Ionicons name="navigate-outline" size={14} color={palette.textMuted} />
                                <Text style={styles.siteMetaMuted}>Không giới hạn vùng GPS</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {locationError && (
            <View style={styles.locationError} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={21} color={palette.danger} />
              <View style={styles.locationErrorCopy}>
                <Text style={styles.locationErrorTitle}>Chưa thể xác thực vị trí</Text>
                <Text style={styles.locationErrorText}>{locationError}</Text>
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <AppButton
              label={actionLabel}
              icon={hasOpenShift ? 'exit-outline' : 'finger-print-outline'}
              variant={hasOpenShift ? 'dark' : 'primary'}
              loading={isActionPending}
              disabled={
                isCheckingState ||
                (!hasOpenShift && (!selectedSite || !canCheckinSelectedSite))
              }
              onPress={hasOpenShift ? () => setCheckoutConfirmVisible(true) : handleCheckin}
              accessibilityHint={
                hasOpenShift
                  ? 'Lấy vị trí và ghi nhận thời gian kết thúc ca'
                  : 'Lấy vị trí và ghi nhận thời gian bắt đầu ca'
              }
            />
            {!hasOpenShift && sites.length > 0 && !selectedSite && (
              <Text style={styles.actionHint}>Chọn một nơi làm việc để tiếp tục.</Text>
            )}
            {!hasOpenShift &&
              selectedSite &&
              selectedAvailabilityStatus &&
              !canCheckinSelectedSite && (
                <Text style={styles.actionHint}>
                  {getAvailabilityDescription(
                    selectedSite,
                    selectedAvailabilityStatus,
                    now.getTime(),
                    dataUpdatedAt,
                  )}
                </Text>
              )}
            <AppButton
              label="Xem lịch sử chấm công"
              icon="time-outline"
              variant="secondary"
              onPress={() => router.push('/(tabs)/checkin-history' as never)}
            />
          </View>
        </ResponsiveContainer>
      </ScrollView>
      <ConfirmDialog
        visible={checkoutConfirmVisible}
        title="Kết thúc ca làm việc?"
        description="Hệ thống sẽ lấy vị trí hiện tại và ghi nhận thời điểm bạn ra ca."
        confirmLabel="Xác nhận ra ca"
        onConfirm={() => void handleCheckout()}
        onCancel={() => setCheckoutConfirmVisible(false)}
        loading={isLocatingOut || isSubmittingOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    backgroundColor: palette.canvas,
  },
  loadingText: { color: palette.textMuted, fontSize: 14 },
  titleBlock: { marginBottom: spacing.xl },
  title: { color: palette.text, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  clockCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    ...shadows.card,
  },
  clockCardActive: { borderColor: '#BBF7D0' },
  clockTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  clock: { color: palette.text, fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1 },
  date: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  statusPillActive: { backgroundColor: palette.successSoft },
  statusPillIdle: { backgroundColor: palette.surfaceMuted },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  activeShiftNotice: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: palette.successSoft,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  activeShiftText: { flex: 1, color: palette.textSecondary, fontSize: 13, lineHeight: 19 },
  section: { marginTop: spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  sectionHeaderCopy: { flex: 1 },
  sectionTitle: { color: palette.text, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  sectionSubtitle: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  countLabel: { color: palette.primary, fontSize: 12, fontWeight: '700', marginTop: 3 },
  emptyCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.borderStrong,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptyDescription: { color: palette.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 3 },
  siteList: { gap: spacing.md, marginTop: spacing.md },
  siteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  siteCardActive: { borderColor: palette.primary, backgroundColor: palette.surfaceBrand },
  siteCardPressed: { opacity: 0.82 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  siteCopy: { flex: 1 },
  siteTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  siteName: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  availabilityBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  availabilityBadgeText: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  siteAddress: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: spacing.sm,
  },
  availabilityText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  siteMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  siteMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  siteMetaText: { color: palette.primary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  siteMetaMuted: { color: palette.textMuted, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  locationError: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  locationErrorCopy: { flex: 1 },
  locationErrorTitle: { color: palette.danger, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  locationErrorText: { color: '#991B1B', fontSize: 12, lineHeight: 18, marginTop: 2 },
  actions: { gap: spacing.md, marginTop: spacing.xxl },
  actionHint: { color: palette.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
