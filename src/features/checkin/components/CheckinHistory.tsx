import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, radius, spacing } from '@/theme/tokens';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';

import { useCheckinHistory } from '../hooks/use-checkin-history';
import { useCheckinSiteOptions } from '../hooks/use-checkin-site-options';
import type { CheckinResponse, CheckinStatus } from '../types/checkin.type';
import { CHECKIN_STATUS_COLORS, CHECKIN_STATUS_LABELS, formatWorkMinutes } from '../utils/checkin.mapper';

const PAGE_SIZE = 20;
const STATUS_BACKGROUNDS: Record<CheckinStatus, string> = {
  valid: palette.successSoft,
  pending_review: palette.warningSoft,
  rejected: palette.dangerSoft,
};
const STATUS_FILTER_OPTIONS: { value: CheckinStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'valid', label: 'Hợp lệ' },
  { value: 'pending_review', label: 'Đang chờ' },
  { value: 'rejected', label: 'Từ chối' },
];

function monthFromDate(date: Date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function moveMonth(period: { year: number; month: number }, offset: number) {
  return monthFromDate(new Date(period.year, period.month - 1 + offset, 1));
}

function monthRangeIso(period: { year: number; month: number }) {
  const from = new Date(Date.UTC(period.year, period.month - 1, 1));
  const to = new Date(Date.UTC(period.year, period.month, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

function faceState(value: boolean | null, expected: boolean): string {
  if (!expected) return 'Không yêu cầu';
  if (value === true) return 'Đạt';
  if (value === false) return 'Không đạt';
  return 'Đang xác thực';
}

/** Employee attendance history with explicit navigation and readable daily cards. */
export function CheckinHistory() {
  const router = useRouter();
  const { formatDate, formatTime } = useTenantPreferences();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CheckinStatus | undefined>(undefined);
  const [siteFilter, setSiteFilter] = useState<string | undefined>(undefined);
  const [useMonthFilter, setUseMonthFilter] = useState(false);
  const [period, setPeriod] = useState(() => monthFromDate(new Date()));
  const { options: siteOptions, isLoading: isLoadingSiteOptions } = useCheckinSiteOptions();

  const dateRange = useMonthFilter ? monthRangeIso(period) : {};
  const { records, totalPages, totalElements, isLoading, isRefetching, isError, refetch } = useCheckinHistory({
    page,
    size: PAGE_SIZE,
    status: statusFilter,
    siteId: siteFilter,
    ...dateRange,
  });

  useEffect(() => {
    if (
      !isLoadingSiteOptions &&
      siteFilter &&
      !siteOptions.some((option) => option.siteId === siteFilter)
    ) {
      setSiteFilter(undefined);
      setPage(0);
    }
  }, [isLoadingSiteOptions, siteFilter, siteOptions]);

  useEffect(() => {
    if (!isLoading && page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [isLoading, page, totalPages]);

  const resetFilters = () => {
    setStatusFilter(undefined);
    setSiteFilter(undefined);
    setUseMonthFilter(false);
    setPage(0);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/checkin');
  };

  const handlePress = (record: CheckinResponse) => {
    router.push({
      pathname: '/modal/checkin-result',
      params: {
        checkinId: record.id,
        ...(record.effectiveCheckinPolicy
          ? { policy: record.effectiveCheckinPolicy }
          : {}),
      },
    } as never);
  };

  const hasActiveFilters = !!statusFilter || !!siteFilter || useMonthFilter;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <AppHeader
        title="Lịch sử chấm công"
        subtitle={isLoading ? undefined : `${totalElements} bản ghi`}
        onBack={goBack}
      />

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTER_OPTIONS.map((option) => {
            const active = statusFilter === option.value;
            return (
              <Pressable
                key={option.label}
                onPress={() => {
                  setStatusFilter(option.value);
                  setPage(0);
                }}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {siteOptions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Pressable
              onPress={() => {
                setSiteFilter(undefined);
                setPage(0);
              }}
              style={[styles.chip, !siteFilter && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: !siteFilter }}
            >
              <Text style={[styles.chipText, !siteFilter && styles.chipTextActive]}>Mọi công trình</Text>
            </Pressable>
            {siteOptions.map((option) => {
              const active = siteFilter === option.siteId;
              return (
                <Pressable
                  key={option.siteId}
                  onPress={() => {
                    setSiteFilter(option.siteId);
                    setPage(0);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.siteName}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.monthRow}>
          <Pressable
            onPress={() => {
              setUseMonthFilter((value) => !value);
              setPage(0);
            }}
            style={[styles.chip, useMonthFilter && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: useMonthFilter }}
          >
            <Text style={[styles.chipText, useMonthFilter && styles.chipTextActive]}>
              {useMonthFilter ? `Tháng ${period.month}/${period.year}` : 'Mọi thời gian'}
            </Text>
          </Pressable>
          {useMonthFilter && (
            <>
              <Pressable
                onPress={() => {
                  setPeriod((value) => moveMonth(value, -1));
                  setPage(0);
                }}
                style={styles.monthNavButton}
                accessibilityRole="button"
                accessibilityLabel="Tháng trước"
              >
                <Ionicons name="chevron-back" size={18} color={palette.primary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setPeriod((value) => moveMonth(value, 1));
                  setPage(0);
                }}
                style={styles.monthNavButton}
                accessibilityRole="button"
                accessibilityLabel="Tháng sau"
              >
                <Ionicons name="chevron-forward" size={18} color={palette.primary} />
              </Pressable>
            </>
          )}
          {hasActiveFilters && (
            <Pressable onPress={resetFilters} style={styles.clearButton} accessibilityRole="button">
              <Text style={styles.clearButtonText}>Xóa lọc</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : isError ? (
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể tải lịch sử chấm công"
          description="Kiểm tra kết nối mạng rồi thử lại."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} />
          }
          contentContainerStyle={[styles.listContent, records.length === 0 && styles.emptyList]}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.itemCard, pressed && styles.itemPressed]}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${formatDate(item.checkInAt)}, ${CHECKIN_STATUS_LABELS[item.status]}`}
              accessibilityHint="Mở chi tiết lần chấm công"
            >
              <View style={styles.cardHeader}>
                <View style={styles.dateWrap}>
                  <View style={styles.calendarIcon}>
                    <Ionicons name="calendar-outline" size={20} color={palette.primary} />
                  </View>
                  <View style={styles.dateCopy}>
                    <Text style={styles.itemDate}>{formatDate(item.checkInAt)}</Text>
                    <Text style={styles.itemSub}>
                      {item.siteName ?? 'Bản ghi chấm công'}
                      {item.source === 'offline' ? ' · Offline' : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_BACKGROUNDS[item.status] }]}>
                  <Text style={[styles.statusText, { color: CHECKIN_STATUS_COLORS[item.status] }]}>
                    {CHECKIN_STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Vào ca</Text>
                  <Text style={styles.timeValue}>{formatTime(item.checkInAt)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={palette.borderStrong} />
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Ra ca</Text>
                  <Text style={styles.timeValue}>{item.checkOutAt ? formatTime(item.checkOutAt) : 'Chưa ghi nhận'}</Text>
                </View>
                <View style={styles.chevron}>
                  <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
                </View>
              </View>

              {item.workMinutes !== null && (
                <Text style={styles.duration}>Tổng thời gian: {formatWorkMinutes(item.workMinutes)}</Text>
              )}
              {item.effectiveCheckinPolicy &&
                item.effectiveCheckinPolicy !== 'gps_only' && (
                  <View style={styles.faceSummary}>
                    <Ionicons name="person-circle-outline" size={15} color={palette.primary} />
                    <Text style={styles.faceSummaryText}>
                      Face vào: {faceState(item.faceVerified, true)}
                      {item.checkOutAt
                        ? ` · Face ra: ${faceState(item.checkoutFaceVerified, true)}`
                        : ''}
                    </Text>
                  </View>
                )}
            </Pressable>
          )}
          ListEmptyComponent={
            <FeedbackState
              icon="time-outline"
              title={hasActiveFilters ? 'Không có bản ghi phù hợp' : 'Chưa có lịch sử chấm công'}
              description={hasActiveFilters
                ? 'Thử thay đổi hoặc xóa bộ lọc để xem các lần chấm công khác.'
                : 'Các lần vào ca và ra ca của bạn sẽ được hiển thị tại đây.'}
            />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination} accessibilityRole="toolbar">
                <Pressable
                  disabled={page === 0}
                  onPress={() => setPage((current) => Math.max(0, current - 1))}
                  style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Trang trước"
                  accessibilityState={{ disabled: page === 0 }}
                >
                  <Ionicons name="chevron-back" size={18} color={page === 0 ? palette.textMuted : palette.primary} />
                  <Text style={[styles.pageButtonText, page === 0 && styles.pageButtonTextDisabled]}>Trước</Text>
                </Pressable>
                <Text style={styles.pageLabel}>Trang {page + 1} / {totalPages}</Text>
                <Pressable
                  disabled={page >= totalPages - 1}
                  onPress={() => setPage((current) => current + 1)}
                  style={[styles.pageButton, page >= totalPages - 1 && styles.pageButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Trang sau"
                  accessibilityState={{ disabled: page >= totalPages - 1 }}
                >
                  <Text style={[styles.pageButtonText, page >= totalPages - 1 && styles.pageButtonTextDisabled]}>Sau</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={page >= totalPages - 1 ? palette.textMuted : palette.primary}
                  />
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { color: palette.textMuted, fontSize: 14 },
  filters: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { color: palette.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: palette.white },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceBrand,
  },
  clearButton: { marginLeft: 'auto', paddingVertical: 6, paddingHorizontal: spacing.sm },
  clearButtonText: { color: palette.danger, fontSize: 12, fontWeight: '700' },
  listContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  emptyList: { flexGrow: 1 },
  itemCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  itemPressed: { backgroundColor: palette.surfaceBrand, borderColor: palette.primarySoft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  dateWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  calendarIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCopy: { flex: 1 },
  itemDate: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  itemSub: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  statusText: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  timeRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeBlock: { minWidth: 72 },
  timeLabel: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  timeValue: { color: palette.text, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  chevron: { marginLeft: 'auto' },
  duration: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  faceSummary: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  faceSummaryText: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.lg },
  pageButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
  },
  pageButtonDisabled: { backgroundColor: palette.surfaceMuted },
  pageButtonText: { color: palette.primary, fontSize: 13, fontWeight: '700' },
  pageButtonTextDisabled: { color: palette.textMuted },
  pageLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: '600' },
});
