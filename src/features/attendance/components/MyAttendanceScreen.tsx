import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { useMemo, useState } from 'react';
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
import { palette, radius, shadows, spacing } from '@/theme/tokens';

import { useMyMonthlyAttendance } from '../hooks/use-my-monthly-attendance';
import type { AttendanceSummary } from '../types/attendance.type';

function attendanceErrorCopy(error: unknown): { title: string; description: string } {
  if (isAxiosError(error)) {
    if (error.response?.status === 404) {
      return {
        title: 'Chưa có hồ sơ nhân viên',
        description: 'Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên trong công ty này.',
      };
    }
    if (error.response?.status === 403) {
      return {
        title: 'Không có quyền xem bảng công',
        description: 'Hãy kiểm tra công ty đang chọn hoặc liên hệ HR để được cấp quyền phù hợp.',
      };
    }
  }
  return {
    title: 'Không thể tải bảng công',
    description: 'Kiểm tra kết nối mạng rồi thử lại.',
  };
}

function monthFromDate(date: Date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function moveMonth(period: { year: number; month: number }, offset: number) {
  return monthFromDate(new Date(period.year, period.month - 1 + offset, 1));
}

function formatMinutes(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours === 0) return `${minutes} phút`;
  if (minutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function formatDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatTime(value: string | null): string {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Metric({
  icon,
  label,
  value,
  tone = palette.primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={19} color={tone} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function WarningBanner({
  icon,
  title,
  description,
  tone,
  background,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tone: string;
  background: string;
}) {
  return (
    <View style={[styles.warning, { backgroundColor: background }]} accessibilityRole="alert">
      <Ionicons name={icon} size={21} color={tone} />
      <View style={styles.warningCopy}>
        <Text style={[styles.warningTitle, { color: tone }]}>{title}</Text>
        <Text style={styles.warningDescription}>{description}</Text>
      </View>
    </View>
  );
}

function DailyCard({ item }: { item: AttendanceSummary }) {
  const [expanded, setExpanded] = useState(false);
  const otWarningLabel = [
    item.otDailyLimitExceeded ? 'vượt giới hạn OT ngày' : null,
    item.otWeeklyLimitExceeded ? 'vượt giới hạn OT tuần' : null,
  ].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={() => setExpanded((current) => !current)}
      style={({ pressed }) => [styles.dayCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${formatDay(item.attendanceDate)}, ${formatMinutes(item.totalWorkMinutes)}${otWarningLabel ? `, ${otWarningLabel}` : ''}`}
      accessibilityHint={expanded ? 'Thu gọn chi tiết' : 'Mở chi tiết bảng công ngày'}
      accessibilityState={{ expanded }}
    >
      <View style={styles.dayHeader}>
        <View style={styles.dayDateWrap}>
          <View style={styles.dayIcon}>
            <Ionicons name="calendar-outline" size={18} color={palette.primary} />
          </View>
          <View>
            <Text style={styles.dayDate}>{formatDay(item.attendanceDate)}</Text>
            <Text style={styles.siteName} numberOfLines={1}>{item.siteName}</Text>
          </View>
        </View>
        <View style={styles.dayTotalWrap}>
          <Text style={styles.dayTotal}>{formatMinutes(item.totalWorkMinutes)}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textMuted} />
        </View>
      </View>

      <View style={styles.badges}>
        {item.hasPendingReviewSession && (
          <View style={[styles.badge, styles.pendingBadge]}>
            <Text style={[styles.badgeText, { color: palette.warning }]}>Chờ HR duyệt</Text>
          </View>
        )}
        {item.hasRejectedSession && (
          <View style={[styles.badge, styles.rejectedBadge]}>
            <Text style={[styles.badgeText, { color: palette.danger }]}>Có phiên bị từ chối</Text>
          </View>
        )}
        {item.hasRandomCheckFailure && (
          <View style={[styles.badge, styles.randomCheckBadge]}>
            <Text style={[styles.badgeText, { color: palette.warning }]}>Random check chưa đạt</Text>
          </View>
        )}
        {item.otDailyLimitExceeded && (
          <View style={[styles.badge, styles.otWarningBadge]}>
            <Text style={[styles.badgeText, { color: palette.warning }]}>Vượt giới hạn OT ngày</Text>
          </View>
        )}
        {item.otWeeklyLimitExceeded && (
          <View style={[styles.badge, styles.otWarningBadge]}>
            <Text style={[styles.badgeText, { color: palette.warning }]}>Vượt giới hạn OT tuần</Text>
          </View>
        )}
        {item.missingCheckout && (
          <View style={[styles.badge, styles.rejectedBadge]}>
            <Text style={[styles.badgeText, { color: palette.danger }]}>Thiếu check-out</Text>
          </View>
        )}
        {item.adjustmentReason && (
          <View style={[styles.badge, styles.adjustedBadge]}>
            <Text style={[styles.badgeText, { color: palette.primary }]}>HR đã điều chỉnh</Text>
          </View>
        )}
      </View>

      <View style={styles.timeLine}>
        <Text style={styles.timeText}>Vào {formatTime(item.firstCheckinAt)}</Text>
        <Ionicons name="arrow-forward" size={14} color={palette.textMuted} />
        <Text style={styles.timeText}>Ra {formatTime(item.lastCheckoutAt)}</Text>
        <Text style={styles.sessionText}>{item.sessionCount} phiên</Text>
      </View>

      {expanded && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Đi muộn</Text>
            <Text style={[styles.detailValue, item.late && styles.negativeValue]}>
              {item.late ? formatMinutes(item.lateMinutes) : 'Không'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Về sớm</Text>
            <Text style={[styles.detailValue, item.earlyLeave && styles.negativeValue]}>
              {item.earlyLeave ? formatMinutes(item.earlyLeaveMinutes) : 'Không'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trong đó OT</Text>
            <Text
              style={[
                styles.detailValue,
                (item.otDailyLimitExceeded || item.otWeeklyLimitExceeded) && styles.warningValue,
              ]}
            >
              {formatMinutes(item.otMinutes)}
            </Text>
          </View>
          {(item.otDailyLimitExceeded || item.otWeeklyLimitExceeded) && (
            <View style={styles.otWarningNote} accessibilityRole="alert">
              <Ionicons name="warning-outline" size={17} color={palette.warning} />
              <Text style={styles.otWarningText}>
                Cảnh báo để bạn và HR đối soát. Hệ thống vẫn giữ nguyên số phút OT và không khóa check-out.
              </Text>
            </View>
          )}
          {item.adjustmentReason && (
            <View style={styles.adjustmentReason}>
              <Text style={styles.adjustmentLabel}>Lý do HR điều chỉnh</Text>
              <Text style={styles.adjustmentText}>{item.adjustmentReason}</Text>
            </View>
          )}
          {(item.hasPendingReviewSession || item.hasRejectedSession) && (
            <Text style={styles.excludedNote}>
              Các phiên chờ duyệt hoặc bị từ chối không được tính vào tổng giờ, đi muộn, về sớm và OT.
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export function MyAttendanceScreen() {
  const [period, setPeriod] = useState(() => monthFromDate(new Date()));
  const currentPeriod = monthFromDate(new Date());
  const query = useMyMonthlyAttendance(period);
  const data = query.data;
  const isCurrentOrFuture =
    period.year > currentPeriod.year ||
    (period.year === currentPeriod.year && period.month >= currentPeriod.month);
  const days = useMemo(
    () => [...(data?.dailySummaries ?? [])].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)),
    [data?.dailySummaries],
  );
  const errorCopy = attendanceErrorCopy(query.error);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Bảng công của tôi</Text>
        <Text style={styles.subtitle}>Giờ làm, đi muộn, về sớm và tăng ca</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={palette.primary}
          />
        }
      >
        <ResponsiveContainer>
          <View style={styles.monthPicker}>
            <Pressable
              onPress={() => setPeriod((value) => moveMonth(value, -1))}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Xem tháng trước"
            >
              <Ionicons name="chevron-back" size={22} color={palette.primary} />
            </Pressable>
            <View style={styles.monthCopy}>
              <Text style={styles.monthLabel}>Tháng {period.month}/{period.year}</Text>
              <Text style={styles.monthHint}>Số liệu theo công ty đang chọn</Text>
            </View>
            <Pressable
              disabled={isCurrentOrFuture}
              onPress={() => setPeriod((value) => moveMonth(value, 1))}
              style={({ pressed }) => [
                styles.monthButton,
                isCurrentOrFuture && styles.disabled,
                pressed && !isCurrentOrFuture && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Xem tháng sau"
              accessibilityState={{ disabled: isCurrentOrFuture }}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={isCurrentOrFuture ? palette.borderStrong : palette.primary}
              />
            </Pressable>
          </View>

          {query.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={styles.loadingText}>Đang tải bảng công...</Text>
            </View>
          ) : query.isError ? (
            <FeedbackState
              icon="cloud-offline-outline"
              title={errorCopy.title}
              description={errorCopy.description}
              actionLabel="Thử lại"
              onAction={() => void query.refetch()}
            />
          ) : data ? (
            <>
              {data.daysWithPendingReview > 0 && (
                <WarningBanner
                  icon="time-outline"
                  title={`${data.daysWithPendingReview} ngày có phiên đang chờ duyệt`}
                  description="Số giờ hiện tại có thể thấp hơn thực tế và chưa phải số liệu chốt."
                  tone={palette.warning}
                  background={palette.warningSoft}
                />
              )}
              {data.daysWithRejectedSession > 0 && (
                <WarningBanner
                  icon="close-circle-outline"
                  title={`${data.daysWithRejectedSession} ngày có phiên bị từ chối`}
                  description="Các phiên bị từ chối đã được loại khỏi toàn bộ số liệu công."
                  tone={palette.danger}
                  background={palette.dangerSoft}
                />
              )}
              {data.daysWithRandomCheckFailure > 0 && (
                <WarningBanner
                  icon="shield-outline"
                  title={`${data.daysWithRandomCheckFailure} ngày có random check chưa đạt`}
                  description="Đây là cảnh báo tuân thủ để bạn và HR đối soát; hệ thống không tự trừ giờ làm hoặc OT."
                  tone={palette.warning}
                  background={palette.warningSoft}
                />
              )}

              <View style={styles.summaryCard}>
                <Text style={styles.sectionEyebrow}>
                  {data.daysWithPendingReview > 0 ? 'TỔNG QUAN TẠM TÍNH' : 'TỔNG QUAN THÁNG'}
                </Text>
                <Text style={styles.totalHours}>{formatMinutes(data.totalWorkMinutes)}</Text>
                <Text style={styles.totalHint}>
                  {data.daysWithPendingReview > 0 ? 'Chưa gồm các phiên đang chờ HR duyệt · ' : ''}
                  Tổng giờ đã gồm {formatMinutes(data.totalOtMinutes)} OT
                </Text>
                <View style={styles.metricsGrid}>
                  <Metric icon="calendar-outline" label="Ngày ghi nhận" value={`${data.presentDays}`} />
                  <Metric icon="time-outline" label="Ngày đi muộn" value={`${data.lateDays}`} tone={palette.warning} />
                  <Metric icon="exit-outline" label="Ngày về sớm" value={`${data.earlyLeaveDays}`} tone={palette.warning} />
                  <Metric icon="alert-circle-outline" label="Thiếu check-out" value={`${data.missingCheckoutDays}`} tone={palette.danger} />
                </View>
                <View style={styles.breakdown}>
                  <Text style={styles.breakdownText}>Đi muộn: {formatMinutes(data.totalLateMinutes)}</Text>
                  <Text style={styles.breakdownText}>Về sớm: {formatMinutes(data.totalEarlyLeaveMinutes)}</Text>
                </View>
              </View>

              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Chi tiết từng ngày</Text>
                <Text style={styles.listCount}>{days.length} ngày</Text>
              </View>
              {days.length > 0 ? (
                <View style={styles.dayList}>
                  {days.map((item) => <DailyCard key={item.id} item={item} />)}
                </View>
              ) : (
                <FeedbackState
                  icon="calendar-clear-outline"
                  title="Chưa có dữ liệu công"
                  description="Các ngày có check-in trong tháng sẽ xuất hiện tại đây."
                />
              )}
            </>
          ) : null}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  header: {
    minHeight: 70,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  title: { color: palette.text, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  monthButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  monthCopy: { flex: 1, alignItems: 'center' },
  monthLabel: { color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  monthHint: { color: palette.textMuted, fontSize: 10, lineHeight: 15 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72 },
  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: palette.textMuted, fontSize: 14 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md },
  warningCopy: { flex: 1 },
  warningTitle: { fontSize: 13, lineHeight: 19, fontWeight: '800' },
  warningDescription: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  summaryCard: { backgroundColor: palette.surface, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xxl, ...shadows.card },
  sectionEyebrow: { color: palette.primary, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 0.7 },
  totalHours: { color: palette.text, fontSize: 30, lineHeight: 38, fontWeight: '900', marginTop: spacing.xs },
  totalHint: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border, paddingTop: spacing.lg },
  metric: { width: '50%', minHeight: 78, paddingVertical: spacing.sm, paddingRight: spacing.sm },
  metricValue: { color: palette.text, fontSize: 18, lineHeight: 24, fontWeight: '800', marginTop: 3 },
  metricLabel: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, backgroundColor: palette.surfaceMuted, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  breakdownText: { color: palette.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { color: palette.text, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  listCount: { color: palette.textMuted, fontSize: 12 },
  dayList: { gap: spacing.md },
  dayCard: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  dayDateWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: palette.surfaceBrand, alignItems: 'center', justifyContent: 'center' },
  dayDate: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '800', textTransform: 'capitalize' },
  siteName: { color: palette.textMuted, fontSize: 11, lineHeight: 16, maxWidth: 150 },
  dayTotalWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dayTotal: { color: palette.text, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  pendingBadge: { backgroundColor: palette.warningSoft },
  rejectedBadge: { backgroundColor: palette.dangerSoft },
  adjustedBadge: { backgroundColor: palette.primarySoft },
  randomCheckBadge: { backgroundColor: palette.warningSoft },
  otWarningBadge: { backgroundColor: palette.warningSoft },
  badgeText: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  timeLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  timeText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  sessionText: { marginLeft: 'auto', color: palette.textMuted, fontSize: 11 },
  details: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border, gap: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  detailLabel: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  detailValue: { color: palette.text, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  negativeValue: { color: palette.warning },
  warningValue: { color: palette.warning },
  otWarningNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: palette.warningSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs },
  otWarningText: { flex: 1, color: palette.textSecondary, fontSize: 11, lineHeight: 17 },
  adjustmentReason: { backgroundColor: palette.surfaceBrand, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs },
  adjustmentLabel: { color: palette.primary, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  adjustmentText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  excludedNote: { color: palette.textMuted, fontSize: 11, lineHeight: 17, fontStyle: 'italic', marginTop: spacing.xs },
});
