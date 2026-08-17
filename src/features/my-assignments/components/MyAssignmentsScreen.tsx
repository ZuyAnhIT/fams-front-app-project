import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';
import { palette, radius, spacing } from '@/theme/tokens';

import { useMyAssignments } from '../hooks/use-my-assignments';
import type { MyAssignment } from '../types/my-assignment.type';
import {
  ASSIGNMENT_ROLE_LABELS,
  ASSIGNMENT_STATUS_BACKGROUNDS,
  ASSIGNMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  formatDaysOfWeek,
} from '../utils/my-assignment.mapper';

/** Toàn bộ phân công của nhân viên hiện tại, gộp mọi công trình — khác với màn "Phân công tại
 *  công trình" (chỉ dành cho quản lý/giám sát, xem theo 1 site cụ thể). */
export function MyAssignmentsScreen() {
  const router = useRouter();
  const { formatDate, formatDateTime } = useTenantPreferences();
  const { assignments, isLoading, isRefetching, isError, refetch } = useMyAssignments();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <AppHeader title="Phân công của tôi" onBack={goBack} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Đang tải phân công...</Text>
        </View>
      ) : isError ? (
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể tải danh sách phân công"
          description="Kiểm tra kết nối mạng rồi thử lại."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} />
          }
          contentContainerStyle={[styles.listContent, assignments.length === 0 && styles.emptyList]}
          renderItem={({ item }) => <AssignmentCard item={item} formatDate={formatDate} formatDateTime={formatDateTime} />}
          ListEmptyComponent={
            <FeedbackState
              icon="clipboard-outline"
              title="Chưa có phân công nào"
              description="Khi được phân công vào công trình, thông tin sẽ hiển thị tại đây."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function AssignmentCard({
  item,
  formatDate,
  formatDateTime,
}: {
  item: MyAssignment;
  formatDate: (value: string) => string;
  formatDateTime: (value: string) => string;
}) {
  const isCancelled = item.status === 'cancelled';
  return (
    <View style={[styles.card, isCancelled && styles.cardCancelled]}>
      <View style={styles.cardHeader}>
        <View style={styles.siteWrap}>
          <View style={styles.siteIcon}>
            <Ionicons name="business-outline" size={20} color={palette.primary} />
          </View>
          <View style={styles.siteCopy}>
            <Text style={styles.siteName} numberOfLines={1}>
              {item.siteSummary?.name ?? 'Công trình không còn tồn tại'}
            </Text>
            <Text style={styles.roleText}>{ASSIGNMENT_ROLE_LABELS[item.role]}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ASSIGNMENT_STATUS_BACKGROUNDS[item.status] }]}>
          <Text style={[styles.statusText, { color: ASSIGNMENT_STATUS_COLORS[item.status] }]}>
            {ASSIGNMENT_STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={15} color={palette.textMuted} />
        <Text style={styles.detailText}>
          {formatDate(item.startDate)} — {item.endDate ? formatDate(item.endDate) : 'Vô thời hạn'}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="repeat-outline" size={15} color={palette.textMuted} />
        <Text style={styles.detailText}>{formatDaysOfWeek(item.daysOfWeek)}</Text>
      </View>

      {item.shiftSummary && (
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={15} color={palette.textMuted} />
          <Text style={styles.detailText}>
            {item.shiftSummary.name} ({item.shiftSummary.startTime}–{item.shiftSummary.endTime})
            {item.shiftSummary.status === 'inactive' ? ' · Ca đã ngừng dùng' : ''}
          </Text>
        </View>
      )}

      {isCancelled && item.cancelledAt && (
        <View style={styles.cancelledNote}>
          <Ionicons name="close-circle-outline" size={15} color={palette.danger} />
          <Text style={styles.cancelledText}>Đã hủy lúc {formatDateTime(item.cancelledAt)}</Text>
        </View>
      )}

      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </View>
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
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardCancelled: { opacity: 0.75 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  siteWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  siteIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteCopy: { flex: 1 },
  siteName: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  roleText: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  statusText: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  cancelledNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  cancelledText: { color: palette.danger, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  notes: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
