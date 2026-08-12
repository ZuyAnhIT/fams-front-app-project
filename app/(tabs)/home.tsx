import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { useProfile } from '@/features/auth/hooks/use-profile';
import { useEmployeeDashboard, useIsCurrentTenantSupervisor } from '@/features/dashboard/hooks/use-dashboard';
import { useMyPendingRandomChecks } from '@/features/random-check/hooks/use-random-check';
import { secondsLeft } from '@/features/random-check/utils/random-check.utils';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';
import { palette, radius, shadows, spacing } from '@/theme/tokens';

interface QuickAction {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

const CHECKIN_STATUS_LABELS = {
  valid: 'Hợp lệ',
  pending_review: 'Chờ HR duyệt',
  rejected: 'Không hợp lệ',
} as const;

export default function HomeScreen() {
  const { formatDate } = useTenantPreferences();
  const {
    profile,
    isLoading: isLoadingProfile,
    isRefetching: isRefetchingProfile,
    refetch: refetchProfile,
  } = useProfile();
  const dashboardQuery = useEmployeeDashboard();
  const { isSupervisor } = useIsCurrentTenantSupervisor();
  const randomCheckQuery = useMyPendingRandomChecks();
  const activeRandomChecks = randomCheckQuery.checks.filter(
    (item) =>
      item.status === 'sent' &&
      secondsLeft(item, Date.now(), randomCheckQuery.dataUpdatedAt) > 0,
  );
  const dashboard = dashboardQuery.data;
  const todayShifts = dashboard?.todayShifts ?? [];
  const firstShift = todayShifts[0];
  const pendingExplanations = dashboard?.alerts.pendingExplanations ?? 0;
  const unreadNotifications = dashboard?.alerts.unreadNotifications ?? 0;
  const displayName = profile?.full_name?.trim() || 'bạn';
  const firstName = displayName.split(/\s+/).at(-1) ?? displayName;
  const initial = displayName.charAt(0).toUpperCase();

  const quickActions: QuickAction[] = [
    {
      label: 'Chấm công',
      description: 'Bắt đầu hoặc kết thúc ca',
      icon: 'finger-print-outline',
      route: '/(tabs)/checkin',
    },
    {
      label: 'Lịch sử',
      description: 'Xem các lần chấm công',
      icon: 'time-outline',
      route: '/(tabs)/checkin-history',
    },
    {
      label: 'Bảng công',
      description: 'Xem công ngày và tổng hợp tháng',
      icon: 'stats-chart-outline',
      route: '/(tabs)/attendance',
    },
    {
      label: 'Nơi làm hôm nay',
      description: 'Ca và công trình được phép chấm công',
      icon: 'clipboard-outline',
      route: '/(tabs)/checkin',
    },
    {
      label: 'Kiểm tra ngẫu nhiên',
      description: activeRandomChecks.length > 0
        ? `${activeRandomChecks.length} yêu cầu cần phản hồi ngay`
        : 'Xem yêu cầu kiểm tra hiện trường',
      icon: 'scan-outline',
      route: '/(tabs)/random-check',
      badge: activeRandomChecks.length,
    },
    {
      label: 'Cần giải thích',
      description: pendingExplanations > 0
        ? `${pendingExplanations} mục cần theo dõi hoặc đang chờ HR`
        : 'Không có chấm công hoặc vi phạm cần giải thích',
      icon: 'chatbox-ellipses-outline',
      route: '/(tabs)/exceptions',
      badge: pendingExplanations,
    },
    {
      label: 'Thông báo',
      description: unreadNotifications > 0 ? `${unreadNotifications} thông báo chưa đọc` : 'Không có thông báo mới',
      icon: 'notifications-outline',
      route: '/(tabs)/notifications',
      badge: unreadNotifications,
    },
  ];
  if (isSupervisor) {
    quickActions.splice(1, 0, {
      label: 'Hiện trường của tôi',
      description: 'Xem nhân viên đang có mặt tại các công trình phụ trách',
      icon: 'people-circle-outline',
      route: '/(tabs)/supervisor-dashboard',
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingProfile || dashboardQuery.isRefetching || randomCheckQuery.isRefetching}
            onRefresh={() => {
              refetchProfile();
              dashboardQuery.refetch();
              randomCheckQuery.refetch();
            }}
            tintColor={palette.primary}
          />
        }
      >
        <ResponsiveContainer>
          <View style={styles.profileHeader}>
            <View style={styles.profileCopy}>
              <Text style={styles.eyebrow}>{greeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
              <Text style={styles.date}>Hôm nay · {formatDate(new Date())}</Text>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Mở hồ sơ cá nhân"
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
              ) : (
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </Pressable>
          </View>

          {activeRandomChecks.length > 0 && (
            <Pressable
              onPress={() => router.push('/(tabs)/random-check')}
              style={({ pressed }) => [styles.randomCheckAlert, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${activeRandomChecks.length} yêu cầu kiểm tra ngẫu nhiên cần phản hồi`}
            >
              <View style={styles.alertIcon}>
                <Ionicons name="warning-outline" size={25} color={palette.danger} />
              </View>
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>Kiểm tra ngẫu nhiên đang chờ</Text>
                <Text style={styles.alertText}>{activeRandomChecks.length} yêu cầu có giới hạn thời gian. Phản hồi ngay.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.danger} />
            </Pressable>
          )}

          {(pendingExplanations > 0 || unreadNotifications > 0) && (
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>Cần bạn xử lý</Text>
              {pendingExplanations > 0 && (
                <Pressable onPress={() => router.push('/(tabs)/exceptions' as never)} style={styles.taskRow}>
                  <Ionicons name="chatbox-ellipses-outline" size={20} color={palette.warning} />
                  <Text style={styles.taskText}>{pendingExplanations} chấm công/vi phạm cần theo dõi</Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                </Pressable>
              )}
              {unreadNotifications > 0 && (
                <Pressable onPress={() => router.push('/(tabs)/notifications' as never)} style={styles.taskRow}>
                  <Ionicons name="notifications-outline" size={20} color={palette.primary} />
                  <Text style={styles.taskText}>{unreadNotifications} thông báo chưa đọc</Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.shiftCard}>
            <View style={styles.shiftHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>CA LÀM HÔM NAY</Text>
                <Text style={styles.shiftTitle}>
                  {dashboardQuery.isLoading
                    ? 'Đang kiểm tra lịch làm việc'
                    : firstShift?.shift?.name ?? (todayShifts.length > 0 ? 'Ca làm được phân công' : 'Chưa có ca làm')}
                </Text>
              </View>
              <View style={styles.calendarIcon}>
                <Ionicons name="calendar-outline" size={24} color={palette.primary} />
              </View>
            </View>

            {dashboardQuery.isLoading ? (
              <ActivityIndicator style={styles.shiftLoader} color={palette.primary} />
            ) : dashboardQuery.isError ? (
              <Text style={styles.mutedText}>Không thể tải lịch làm việc. Kéo xuống để thử lại.</Text>
            ) : firstShift ? (
              <View style={styles.shiftDetails}>
                <View style={styles.detailLine}>
                  <Ionicons name="business-outline" size={17} color={palette.textMuted} />
                  <Text style={styles.detailText} numberOfLines={1}>{firstShift.siteName || 'Công trình chưa có tên'}</Text>
                </View>
                {firstShift.shift && (
                  <View style={styles.detailLine}>
                    <Ionicons name="time-outline" size={17} color={palette.textMuted} />
                    <Text style={styles.detailText}>
                      {firstShift.shift.startTime.slice(0, 5)} – {firstShift.shift.endTime.slice(0, 5)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailLine}>
                  <Ionicons name={dashboard?.checkin?.open ? 'radio-button-on-outline' : 'checkmark-circle-outline'} size={17} color={dashboard?.checkin?.open ? palette.success : palette.textMuted} />
                  <Text style={styles.detailText}>
                    {!dashboard?.checkin
                      ? 'Chưa check-in hôm nay'
                      : dashboard.checkin.open
                        ? `Đang trong ca · ${CHECKIN_STATUS_LABELS[dashboard.checkin.status]}`
                        : `Đã kết thúc · ${CHECKIN_STATUS_LABELS[dashboard.checkin.status]} · ${dashboard.checkin.workMinutes ?? 0} phút`}
                  </Text>
                </View>
                {todayShifts.length > 1 && (
                  <Text style={styles.additionalSites}>+{todayShifts.length - 1} ca/công trình khác hôm nay</Text>
                )}
              </View>
            ) : (
              <Text style={styles.mutedText}>Bạn chưa được phân công công trình hoặc ca làm hôm nay.</Text>
            )}

            <Pressable
              onPress={() => router.push('/(tabs)/checkin')}
              style={({ pressed }) => [styles.shiftAction, pressed && styles.shiftActionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Mở màn hình chấm công"
            >
              <Text style={styles.shiftActionText}>{dashboard?.checkin?.open ? 'Mở check-out' : 'Mở chấm công'}</Text>
              <Ionicons name="arrow-forward" size={18} color={palette.white} />
            </Pressable>
          </View>

          {dashboard?.monthlyAttendance && (
            <View style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <View><Text style={styles.sectionEyebrow}>CÔNG THÁNG {dashboard.monthlyAttendance.month}</Text><Text style={styles.monthTotal}>{Math.floor(dashboard.monthlyAttendance.totalWorkMinutes / 60)} giờ làm việc</Text></View>
                <Pressable onPress={() => router.push('/(tabs)/attendance')}><Text style={styles.monthLink}>Xem chi tiết</Text></Pressable>
              </View>
              <View style={styles.metricGrid}>
                {[
                  ['Ngày công', dashboard.monthlyAttendance.presentDays],
                  ['Đi muộn', dashboard.monthlyAttendance.lateDays],
                  ['Về sớm', dashboard.monthlyAttendance.earlyLeaveDays],
                  ['OT', `${dashboard.monthlyAttendance.totalOtMinutes} phút`],
                ].map(([label, value]) => <View key={String(label)} style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}
              </View>
              {dashboard.monthlyAttendance.missingCheckoutDays > 0 && <Text style={styles.monthWarning}>{dashboard.monthlyAttendance.missingCheckoutDays} ngày thiếu check-out cần kiểm tra</Text>}
            </View>
          )}

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
            <Text style={styles.sectionSubtitle}>Các tác vụ thường dùng trong ngày</Text>
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as never)}
                style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityHint={action.description}
              >
                <View style={styles.quickIconWrap}>
                  <Ionicons name={action.icon} size={23} color={palette.primary} />
                  {!!action.badge && action.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{action.badge > 99 ? '99+' : action.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickTitle}>{action.label}</Text>
                <Text style={styles.quickDescription} numberOfLines={2}>{action.description}</Text>
              </Pressable>
            ))}
          </View>

          {!isLoadingProfile && profile?.department && (
            <View style={styles.departmentBanner}>
              <Ionicons name="people-outline" size={20} color={palette.textSecondary} />
              <View style={styles.departmentCopy}>
                <Text style={styles.departmentLabel}>Đơn vị công tác</Text>
                <Text style={styles.departmentValue}>{profile.department}</Text>
              </View>
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileCopy: { flex: 1, paddingRight: spacing.lg },
  eyebrow: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
  name: { color: palette.text, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  date: { color: palette.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarInitial: { color: palette.primary, fontSize: 21, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  randomCheckAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.dangerSoft,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  alertIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  alertCopy: { flex: 1 },
  alertTitle: { color: palette.danger, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  alertText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  taskCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  taskTitle: { color: palette.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.xs },
  taskRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: palette.surfaceMuted, paddingHorizontal: spacing.md },
  taskText: { flex: 1, color: palette.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  shiftCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  sectionEyebrow: { color: palette.primary, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 0.8 },
  shiftTitle: { color: palette.text, fontSize: 19, lineHeight: 26, fontWeight: '800', marginTop: 4 },
  calendarIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftLoader: { alignSelf: 'flex-start', marginTop: spacing.xl },
  shiftDetails: { gap: spacing.sm, marginTop: spacing.lg },
  detailLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { flex: 1, color: palette.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  additionalSites: { color: palette.primary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  mutedText: { color: palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.lg },
  shiftAction: {
    marginTop: spacing.xl,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  shiftActionPressed: { backgroundColor: palette.primaryPressed },
  shiftActionText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  monthCard: { marginTop: spacing.lg, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.xl, padding: spacing.xl, ...shadows.card },
  monthHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  monthTotal: { color: palette.text, fontSize: 20, lineHeight: 27, fontWeight: '800', marginTop: spacing.xs },
  monthLink: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  metric: { flexGrow: 1, flexBasis: '45%', borderRadius: radius.md, backgroundColor: palette.surfaceMuted, padding: spacing.md },
  metricValue: { color: palette.text, fontSize: 17, fontWeight: '800' },
  metricLabel: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  monthWarning: { color: palette.warning, backgroundColor: palette.warningSoft, borderRadius: radius.md, padding: spacing.sm, fontSize: 12, fontWeight: '600', marginTop: spacing.md },
  sectionHeading: { marginTop: spacing.xxl, marginBottom: spacing.md },
  sectionTitle: { color: palette.text, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  sectionSubtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 145,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  quickCardPressed: { backgroundColor: palette.surfaceBrand, borderColor: palette.primarySoft },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: palette.white, fontSize: 9, fontWeight: '800' },
  quickTitle: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  quickDescription: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  departmentBanner: {
    marginTop: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  departmentCopy: { flex: 1 },
  departmentLabel: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  departmentValue: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
});
