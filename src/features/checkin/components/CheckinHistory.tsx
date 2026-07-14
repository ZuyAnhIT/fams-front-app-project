import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useCheckinHistory } from '../hooks/use-checkin-history';
import type { CheckinResponse } from '../types/checkin.type';
import { CHECKIN_STATUS_COLORS, CHECKIN_STATUS_LABELS } from '../utils/checkin.mapper';

const PAGE_SIZE = 20;

/** Lịch sử chấm công của nhân viên (mở rộng US6). */
export function CheckinHistory() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const { records, totalPages, isLoading, isRefetching, isError, refetch } = useCheckinHistory({
    page,
    size: PAGE_SIZE,
  });

  const handlePress = (record: CheckinResponse) => {
    router.push({ pathname: '/modal/checkin-result', params: { checkinId: record.id } } as unknown as Parameters<
      typeof router.push
    >[0]);
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <Text style={styles.errorTitle}>Không thể tải lịch sử chấm công.</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Text style={styles.title}>Lịch sử chấm công</Text>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.itemCard} onPress={() => handlePress(item)}>
            <Text style={styles.itemDate}>{new Date(item.checkInAt).toLocaleString('vi-VN')}</Text>
            <Text style={[styles.itemStatus, { color: CHECKIN_STATUS_COLORS[item.status] }]}>
              {CHECKIN_STATUS_LABELS[item.status]}
            </Text>
            {item.checkOutAt && (
              <Text style={styles.itemCheckout}>
                Check-out: {new Date(item.checkOutAt).toLocaleString('vi-VN')}
              </Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có lịch sử chấm công.</Text>
          </View>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                disabled={page === 0}
                onPress={() => setPage((p) => Math.max(0, p - 1))}
                style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Trước</Text>
              </Pressable>
              <Text style={styles.pageLabel}>
                Trang {page + 1}/{totalPages}
              </Text>
              <Pressable
                disabled={page >= totalPages - 1}
                onPress={() => setPage((p) => p + 1)}
                style={[styles.pageButton, page >= totalPages - 1 && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Sau</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', padding: 16, paddingBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  itemDate: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  itemStatus: { fontSize: 13, fontWeight: '700' },
  itemCheckout: { fontSize: 12, color: '#64748B' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  retryButton: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 15, color: '#64748B' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageButton: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pageButtonDisabled: { backgroundColor: '#CBD5E1' },
  pageButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  pageLabel: { fontSize: 13, color: '#475569' },
});
