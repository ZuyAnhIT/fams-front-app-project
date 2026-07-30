import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, radius, spacing } from '@/theme/tokens';

import { useCheckinHistory } from '../hooks/use-checkin-history';
import type { CheckinResponse, CheckinStatus } from '../types/checkin.type';
import { CHECKIN_STATUS_COLORS, CHECKIN_STATUS_LABELS, formatWorkMinutes } from '../utils/checkin.mapper';

const PAGE_SIZE = 20;
const STATUS_BACKGROUNDS: Record<CheckinStatus, string> = {
  valid: palette.successSoft,
  pending_review: palette.warningSoft,
  rejected: palette.dangerSoft,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
  const [page, setPage] = useState(0);
  const { records, totalPages, isLoading, isRefetching, isError, refetch } = useCheckinHistory({
    page,
    size: PAGE_SIZE,
  });

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

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <AppHeader title="Lịch sử chấm công" onBack={goBack} />

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
              title="Chưa có lịch sử chấm công"
              description="Các lần vào ca và ra ca của bạn sẽ được hiển thị tại đây."
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
