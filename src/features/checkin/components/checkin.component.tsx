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
import { useCurrentEmployeeId } from '@/features/face/hooks/use-current-employee-id';
import { useFaceIdStatus } from '@/features/face/hooks/use-face-id';
import { palette, radius, shadows, spacing } from '@/theme/tokens';

import { useAvailableSites } from '../hooks/use-available-sites';
import { useCheckinSubmit } from '../hooks/use-checkin-submit';
import { useCheckoutSubmit } from '../hooks/use-checkout-submit';
import { useOfflineCheckinSync } from '../hooks/use-offline-checkin-sync';
import { useCheckinStore } from '../store/checkin.store';
import { CheckinLocationMap } from './CheckinLocationMap';
import type {
  AvailableSite,
  CheckinAvailabilityStatus,
} from '../types/checkin.type';
import {
  ASSIGNMENT_ROLE_LABELS,
  AVAILABILITY_LABELS,
  CHECKIN_POLICY_LABELS,
  canCheckinAtSite,
  formatAvailableSiteSchedule,
  formatOfflineSyncReason,
  getAvailabilityDescription,
  getEffectiveAvailabilityStatus,
  getEstimatedServerNow,
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
  return now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

function currentDateLabel(now: Date): string {
  return now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

function formatOpenCheckinLabel(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDeadlineLabel(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** Primary employee attendance experience: one clear action based on shift state. */
export function CheckinHome() {
  const router = useRouter();
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const { profile, isLoading: isLoadingProfile, isError: isProfileError } = useProfile();
  const {
    employeeId,
    isLoading: isLoadingEmployeeId,
  } = useCurrentEmployeeId();
  const {
    faceIdStatus,
    isLoading: isLoadingFaceStatus,
    isError: isFaceStatusError,
    refetch: refetchFaceStatus,
  } = useFaceIdStatus(employeeId);
  const {
    sites,
    isLoading,
    isRefetching,
    isError,
    isForbidden,
    error,
    dataUpdatedAt,
    isUsingOfflineCache,
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
    openCheckin,
  } = useCheckoutSubmit();
  const {
    items: offlineItems,
    pendingCount: offlinePendingCount,
    isConnected,
    isSyncing,
    syncNow,
    remove: removeOfflineItem,
    refresh: refreshOfflineItems,
  } = useOfflineCheckinSync(profile?.id, tenantId);

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
  const serverClockSite = selectedSite ?? sites[0];
  const businessNowMs = serverClockSite
    ? getEstimatedServerNow(serverClockSite, now.getTime(), dataUpdatedAt) ?? now.getTime()
    : now.getTime();
  const businessNow = new Date(businessNowMs);
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
  const selectedRequiresFace =
    selectedSite?.effectiveCheckinPolicy === 'gps_face' ||
    selectedSite?.effectiveCheckinPolicy === 'gps_face_liveness';
  const isOfflineMode = isConnected === false || isUsingOfflineCache;
  const isCheckingFaceReadiness =
    selectedRequiresFace && !isOfflineMode && (isLoadingEmployeeId || isLoadingFaceStatus);
  const isFaceReady = faceIdStatus?.status === 'enrolled';
  const isFaceReadinessBlocked =
    selectedRequiresFace && !isOfflineMode && !isCheckingFaceReadiness && !isFaceReady;
  const sessionExpiresAtMs = openCheckin?.sessionExpiresAt
    ? new Date(openCheckin.sessionExpiresAt).getTime()
    : null;
  const shiftEndsAtMs = openCheckin?.shiftEndsAt
    ? new Date(openCheckin.shiftEndsAt).getTime()
    : null;
  const hasExpiredOpenSession =
    !!openCheckinId &&
    sessionExpiresAtMs !== null &&
    !Number.isNaN(sessionExpiresAtMs) &&
    businessNowMs >= sessionExpiresAtMs;
  const hasOpenShift = !!openCheckinId && !hasExpiredOpenSession;
  const isAfterShiftEnd =
    hasOpenShift &&
    shiftEndsAtMs !== null &&
    !Number.isNaN(shiftEndsAtMs) &&
    businessNowMs >= shiftEndsAtMs;
  const isOvertime = isAfterShiftEnd && openCheckin?.overtimeAllowed === true;
  const isCheckoutGrace = isAfterShiftEnd && !isOvertime;
  const checkoutDeadlineLabel = formatDeadlineLabel(openCheckin?.sessionExpiresAt);
  const hasPendingOfflineCheckin = offlinePendingCount > 0;
  const openSite = openCheckin?.siteId
    ? sites.find((item) => item.site.id === openCheckin.siteId)
    : null;
  const checkoutPolicy =
    openCheckin?.effectiveCheckinPolicy ??
    openSite?.effectiveCheckinPolicy ??
    'gps_only';
  const checkoutSiteId = openSite?.site.id ?? openCheckin?.siteId ?? '';
  const checkoutSiteName =
    openSite?.site.name ?? openCheckin?.siteName ?? 'Công trình';
  const openCheckinLabel = formatOpenCheckinLabel(openCheckin?.checkInAt);
  const isCheckingState = isHydrating || isResolvingOpenCheckin;
  const isActionPending = isLocatingIn || isSubmittingIn || isLocatingOut || isSubmittingOut;
  const locationError = errIn ?? errOut;

  const goToResult = (checkinId: string, policy?: string) => {
    router.push({
      pathname: '/modal/checkin-result',
      params: { checkinId, ...(policy ? { policy } : {}) },
    } as never);
  };

  const handleCheckin = async () => {
    if (!selectedSite || isCheckingState) return;
    if (selectedSite.effectiveCheckinPolicy !== 'gps_only') {
      router.push({
        pathname: '/face/checkin',
        params: {
          siteId: selectedSite.site.id,
          siteName: selectedSite.site.name,
          assignmentId: selectedSite.assignmentId,
          policy: selectedSite.effectiveCheckinPolicy,
          offline: isOfflineMode ? 'true' : 'false',
        },
      } as never);
      return;
    }

    const attempt = await checkIn(selectedSite.site.id, {
      assignmentId: selectedSite.assignmentId,
      siteName: selectedSite.site.name,
      effectiveCheckinPolicy: selectedSite.effectiveCheckinPolicy,
    });
    if (attempt.result) {
      goToResult(attempt.result.id, selectedSite.effectiveCheckinPolicy);
    } else if (attempt.queuedOffline) {
      await refreshOfflineItems();
    } else if (attempt.faceRequirement === 'required') {
      router.push({
        pathname: '/face/checkin',
        params: {
          siteId: selectedSite.site.id,
          siteName: selectedSite.site.name,
          assignmentId: selectedSite.assignmentId,
          policy: selectedSite.effectiveCheckinPolicy,
        },
      } as never);
    } else if (attempt.faceRequirement === 'not_enrolled') {
      router.push('/face/enroll');
    }
  };

  const handleCheckout = async () => {
    if (checkoutPolicy !== 'gps_only') {
      setCheckoutConfirmVisible(false);
      router.push({
        pathname: '/face/checkout',
        params: {
          siteId: checkoutSiteId,
          siteName: checkoutSiteName,
          policy: checkoutPolicy,
        },
      } as never);
      return;
    }
    const attempt = await checkOut();
    setCheckoutConfirmVisible(false);
    if (attempt.result) {
      goToResult(attempt.result.id, checkoutPolicy);
    } else if (attempt.faceRequirement === 'required' && checkoutSiteId) {
      router.push({
        pathname: '/face/checkout',
        params: {
          siteId: checkoutSiteId,
          siteName: checkoutSiteName,
          policy: checkoutPolicy === 'gps_only' ? 'gps_face' : checkoutPolicy,
        },
      } as never);
    } else if (attempt.faceRequirement === 'not_enrolled') {
      router.push('/face/enroll');
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

  const actionLabel = hasPendingOfflineCheckin
    ? 'Đang chờ đồng bộ chấm công'
    : hasOpenShift
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
                <Text style={styles.clock}>{currentTimeLabel(businessNow)}</Text>
                <Text style={styles.date}>{currentDateLabel(businessNow)}</Text>
              </View>
              <View style={[styles.statusPill, hasOpenShift ? styles.statusPillActive : styles.statusPillIdle]}>
                <View style={[styles.statusDot, { backgroundColor: hasOpenShift ? palette.success : palette.textMuted }]} />
                <Text style={[styles.statusText, { color: hasOpenShift ? palette.success : palette.textSecondary }]}>
                  {hasOpenShift
                    ? isOvertime
                      ? 'Đang làm thêm giờ'
                      : isCheckoutGrace
                        ? 'Chờ check-out'
                        : 'Đang trong ca'
                    : hasExpiredOpenSession
                      ? 'Ca đã kết thúc'
                      : 'Chưa bắt đầu ca'}
                </Text>
              </View>
            </View>

            {hasOpenShift ? (
              <View style={styles.activeShiftNotice}>
                <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                <Text style={styles.activeShiftText}>
                  {isOvertime
                    ? `Ca chính đã kết thúc. Bạn đang làm thêm giờ tại ${checkoutSiteName}${
                        checkoutDeadlineLabel ? ` và cần check-out trước ${checkoutDeadlineLabel}` : ''
                      }.`
                    : isCheckoutGrace
                      ? `Ca đã kết thúc. Hãy check-out tại ${checkoutSiteName}${
                          checkoutDeadlineLabel ? ` trước ${checkoutDeadlineLabel}` : ''
                        }; thời gian sau giờ kết thúc không được tính OT.`
                      : `Đã check-in tại ${checkoutSiteName}${
                          openCheckinLabel ? ` lúc ${openCheckinLabel}` : ''
                        }. Khi kết thúc công việc, hãy check-out tại vị trí hiện tại.`}
                </Text>
              </View>
            ) : hasExpiredOpenSession ? (
              <View style={styles.activeShiftNotice}>
                <Ionicons name="warning-outline" size={20} color={palette.warning} />
                <Text style={styles.activeShiftText}>
                  Ca đã tự đóng do quá hạn check-out. Lịch sử vẫn ghi nhận thiếu check-out để bạn gửi giải trình cho HR.
                </Text>
              </View>
            ) : isCheckingState ? (
              <View style={styles.activeShiftNotice}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text style={styles.activeShiftText}>Đang đối chiếu ca làm việc gần nhất...</Text>
              </View>
            ) : null}
          </View>

          {isUsingOfflineCache && (
            <View style={styles.offlineCard} accessibilityRole="alert">
              <View style={styles.offlineHeader}>
                <Ionicons name="cloud-offline-outline" size={22} color={palette.warning} />
                <View style={styles.offlineCopy}>
                  <Text style={styles.offlineTitle}>Đang dùng lịch đã lưu trên thiết bị</Text>
                  <Text style={styles.offlineText}>
                    Chấm công sẽ được giữ an toàn trên máy và tự đối soát với máy chủ khi có mạng.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {offlineItems.length > 0 && (
            <View style={styles.offlineCard}>
              <View style={styles.offlineHeader}>
                <Ionicons
                  name={offlinePendingCount > 0 ? 'cloud-upload-outline' : 'warning-outline'}
                  size={22}
                  color={offlinePendingCount > 0 ? palette.primary : palette.warning}
                />
                <View style={styles.offlineCopy}>
                  <Text style={styles.offlineTitle}>
                    {offlinePendingCount > 0
                      ? `${offlinePendingCount} lượt đang chờ đồng bộ`
                      : 'Lượt offline cần kiểm tra'}
                  </Text>
                  <Text style={styles.offlineText}>
                    {isConnected === false
                      ? 'Thiết bị đang offline. Dữ liệu vẫn được giữ trên máy.'
                      : 'Kết nối đã sẵn sàng; bạn có thể đồng bộ ngay.'}
                  </Text>
                </View>
              </View>
              {offlineItems
                .filter((item) => item.status !== 'pending')
                .map((item) => (
                  <View key={item.clientNonce} style={styles.offlineIssue}>
                    <Text style={styles.offlineIssueText}>
                      {item.siteName}: {formatOfflineSyncReason(item.reason)}
                    </Text>
                    <Pressable onPress={() => void removeOfflineItem(item.clientNonce)}>
                      <Text style={styles.removeOfflineText}>Xóa</Text>
                    </Pressable>
                  </View>
                ))}
              <AppButton
                label="Đồng bộ ngay"
                icon="sync-outline"
                variant="secondary"
                loading={isSyncing}
                disabled={isConnected === false || offlinePendingCount === 0}
                onPress={() => void syncNow()}
              />
            </View>
          )}

          {!hasOpenShift && !isCheckingState && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Chọn ca làm việc</Text>
                  <Text style={styles.sectionSubtitle}>Mỗi ca được nhận diện theo phân công, công trình và khung giờ hôm nay.</Text>
                </View>
                <Text style={styles.countLabel}>{sites.length} ca</Text>
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
                            <View style={styles.siteMeta}>
                              <Ionicons
                                name={
                                  item.effectiveCheckinPolicy === 'gps_only'
                                    ? 'location-outline'
                                    : 'person-circle-outline'
                                }
                                size={14}
                                color={
                                  item.effectiveCheckinPolicy === 'gps_only'
                                    ? palette.primary
                                    : palette.warning
                                }
                              />
                              <Text
                                style={
                                  item.effectiveCheckinPolicy === 'gps_only'
                                    ? styles.siteMetaText
                                    : styles.faceRequiredText
                                }
                              >
                                {CHECKIN_POLICY_LABELS[item.effectiveCheckinPolicy]}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {!hasOpenShift && selectedSite && <CheckinLocationMap site={selectedSite} />}

          {!hasOpenShift && selectedRequiresFace && (
            <View
              style={[
                styles.faceReadinessCard,
                isFaceReady && styles.faceReadinessCardReady,
              ]}
            >
              <Ionicons
                name={isFaceReady ? 'shield-checkmark-outline' : 'person-circle-outline'}
                size={23}
                color={isFaceReady ? palette.success : palette.warning}
              />
              <View style={styles.faceReadinessCopy}>
                <Text style={styles.faceReadinessTitle}>
                  {isOfflineMode
                    ? 'Xác thực ảnh khi offline'
                    : isCheckingFaceReadiness
                    ? 'Đang kiểm tra Face ID'
                    : isFaceReady
                      ? 'Face ID đã sẵn sàng'
                      : faceIdStatus?.reviewStatus === 'pending'
                        ? 'Face ID đang chờ HR duyệt'
                        : isFaceStatusError
                          ? 'Chưa kiểm tra được Face ID'
                          : 'Cần đăng ký Face ID'}
                </Text>
                <Text style={styles.faceReadinessText}>
                  {isOfflineMode
                    ? 'Ứng dụng sẽ lưu ảnh bằng chứng; máy chủ sẽ xác minh hoặc chuyển HR duyệt khi đồng bộ.'
                    : isFaceReady
                    ? 'Bạn có thể xác thực khuôn mặt khi vào và ra ca.'
                    : 'Ca đã chọn yêu cầu hồ sơ Face ID được phê duyệt trước khi chấm công.'}
                </Text>
              </View>
              {!isOfflineMode && !isCheckingFaceReadiness && !isFaceReady && (
                <Pressable
                  onPress={() =>
                    isFaceStatusError
                      ? void refetchFaceStatus()
                      : router.push('/face/enroll')
                  }
                  style={styles.faceReadinessAction}
                >
                  <Text style={styles.faceReadinessActionText}>
                    {isFaceStatusError ? 'Thử lại' : 'Xem'}
                  </Text>
                </Pressable>
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
                hasPendingOfflineCheckin ||
                (!hasOpenShift && (
                  !!isCheckingFaceReadiness ||
                  !!isFaceReadinessBlocked ||
                  !selectedSite ||
                  !canCheckinSelectedSite
                ))
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
  offlineCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: palette.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  offlineCopy: { flex: 1 },
  offlineTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  offlineText: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  offlineIssue: {
    borderRadius: radius.md,
    backgroundColor: palette.warningSoft,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  offlineIssueText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  removeOfflineText: { color: palette.danger, fontSize: 12, fontWeight: '800' },
  faceReadinessCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: palette.warningSoft,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  faceReadinessCardReady: {
    borderColor: '#BBF7D0',
    backgroundColor: palette.successSoft,
  },
  faceReadinessCopy: { flex: 1 },
  faceReadinessTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  faceReadinessText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  faceReadinessAction: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  faceReadinessActionText: { color: palette.primary, fontSize: 13, fontWeight: '800' },
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
  faceRequiredText: { color: palette.warning, fontSize: 11, lineHeight: 16, fontWeight: '700' },
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
