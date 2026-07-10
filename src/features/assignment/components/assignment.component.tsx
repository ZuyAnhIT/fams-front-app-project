import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAssignmentList, useSiteOptions, useSiteShiftNames, type AssignmentRow } from '../hooks/use-assignment';
import type { AssignmentListParams, AssignmentRole, AssignmentStatus } from '../types/assignment.type';
import {
  ASSIGNMENT_ROLE_FILTER_OPTIONS,
  ASSIGNMENT_ROLE_LABELS,
  ASSIGNMENT_STATUS_FILTER_OPTIONS,
  ASSIGNMENT_STATUS_LABELS,
  formatAssignmentDateRange,
  parseAssignmentError,
} from '../utils/assignment.mapper';

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<AssignmentStatus, { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#15803D' },
  cancelled: { bg: '#FEE2E2', text: '#B91C1C' },
};

function AssignmentListItem({
  row,
  siteName,
  shiftNames,
}: {
  row: AssignmentRow;
  siteName: string;
  shiftNames: Record<string, string>;
}) {
  const { assignment, employeeName, isLoadingEmployeeName } = row;
  const statusColor = STATUS_COLORS[assignment.status];
  const shiftName = assignment.shiftId ? shiftNames[assignment.shiftId] ?? assignment.shiftId : '—';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.employeeName} numberOfLines={1}>
          {isLoadingEmployeeName ? 'Đang tải...' : employeeName ?? assignment.employeeId}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.badgeText, { color: statusColor.text }]}>
            {ASSIGNMENT_STATUS_LABELS[assignment.status]}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText} numberOfLines={1}>
          🏗️ {siteName}
        </Text>
      </View>

      <Text style={styles.metaText}>⏱️ {shiftName}</Text>
      <Text style={styles.metaText}>👤 {ASSIGNMENT_ROLE_LABELS[assignment.role]}</Text>
      <Text style={styles.dateText}>
        {formatAssignmentDateRange(assignment.startDate, assignment.endDate)}
      </Text>
    </View>
  );
}

export function AssignmentListScreen() {
  const { sites, isLoading: isLoadingSites } = useSiteOptions();
  const [siteId, setSiteId] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<AssignmentStatus | 'all'>('all');
  const [role, setRole] = useState<AssignmentRole | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<NonNullable<AssignmentListParams['sortBy']>>('startDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const shiftNames = useSiteShiftNames(siteId);

  const activeSiteId = siteId ?? sites[0]?.id;

  const params = useMemo<AssignmentListParams>(
    () => ({
      page,
      size: PAGE_SIZE,
      status: status === 'all' ? undefined : status,
      role: role === 'all' ? undefined : role,
      sortBy,
      sortDir,
    }),
    [page, status, role, sortBy, sortDir],
  );

  const { rows, totalPages, isLoading, isRefetching, isError, isForbidden, error, refetch } =
    useAssignmentList(activeSiteId, params);

  /**
   * Backend không hỗ trợ query param tìm kiếm cho assignments (chỉ status,
   * role, employeeId, shiftId — xem "Cần xác nhận thêm"). Tìm kiếm ở đây chỉ
   * lọc trên tên nhân viên của trang dữ liệu đã tải, không phải tìm kiếm
   * server-side trên toàn bộ danh sách.
   */
  const filteredRows = useMemo(() => {
    if (!searchInput.trim()) return rows;
    const q = searchInput.trim().toLowerCase();
    return rows.filter((row) => (row.employeeName ?? '').toLowerCase().includes(q));
  }, [rows, searchInput]);

  const activeSite = sites.find((s) => s.id === activeSiteId);

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    setPage(0);
  }, []);

  const toggleSort = useCallback(() => {
    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(0);
  }, []);

  if (isLoadingSites) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (sites.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <Text style={styles.errorIcon}>🏗️</Text>
        <Text style={styles.errorTitle}>Chưa có site nào để xem phân công</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {sites.map((site) => {
            const active = site.id === activeSiteId;
            return (
              <Pressable
                key={site.id}
                onPress={() => handleSiteSelect(site.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {site.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên nhân viên (trong trang hiện tại)..."
          value={searchInput}
          onChangeText={setSearchInput}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {ASSIGNMENT_STATUS_FILTER_OPTIONS.map((option) => {
            const active = status === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setStatus(option.value);
                  setPage(0);
                }}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          {ASSIGNMENT_ROLE_FILTER_OPTIONS.map((option) => {
            const active = role === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setRole(option.value);
                  setPage(0);
                }}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setSortBy((prev) => (prev === 'startDate' ? 'createdAt' : 'startDate'));
              setPage(0);
            }}
            style={styles.sortButton}
          >
            <Text style={styles.sortButtonText}>
              Sắp xếp: {sortBy === 'startDate' ? 'Ngày bắt đầu' : 'Ngày tạo'}
            </Text>
          </Pressable>
          <Pressable onPress={toggleSort} style={styles.sortButton}>
            <Text style={styles.sortButtonText}>{sortDir === 'desc' ? '↓' : '↑'}</Text>
          </Pressable>
        </ScrollView>
      </View>

      {isForbidden ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>🔒</Text>
          <Text style={styles.errorTitle}>Bạn không có quyền xem phân công của site này</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải phân công...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{parseAssignmentError(error)}</Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => item.assignment.id}
          renderItem={({ item }) => (
            <AssignmentListItem
              row={item}
              siteName={activeSite?.name ?? '—'}
              shiftNames={shiftNames}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Không tìm thấy phân công</Text>
              <Text style={styles.emptyDesc}>Thử thay đổi site hoặc bộ lọc.</Text>
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  toolbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    gap: 8,
  },
  searchInput: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortButton: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#EFF6FF',
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  listContent: {
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  pageButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pageButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pageLabel: {
    fontSize: 13,
    color: '#475569',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    padding: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
