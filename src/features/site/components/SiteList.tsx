import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useRouter } from 'expo-router';

import { useSiteList } from '../hooks/use-site-list';
import type { Site, SiteStatus } from '../types/Site';
import { SITE_STATUS_FILTER_OPTIONS } from '../utils/site.utils';
import { SiteListItem } from './SiteListItem';

const PAGE_SIZE = 10;

export function SiteList() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SiteStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const debouncedSetSearch = useCallback((value: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(0);
    }, 400);
  }, []);

  const params = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      sortBy: 'name' as const,
      sortDir: (sortDesc ? 'desc' : 'asc') as 'asc' | 'desc',
    }),
    [page, search, status, sortDesc],
  );

  const { sites, totalPages, isLoading, isRefetching, isError, isForbidden, refetch } =
    useSiteList(params);

  const handlePress = useCallback(
    (site: Site) => {
      router.push(
        { pathname: '/site/[id]', params: { id: site.id } } as unknown as Parameters<
          typeof router.push
        >[0],
      );
    },
    [router],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch],
  );

  if (isForbidden) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>🔒</Text>
        <Text style={styles.errorTitle}>Bạn không có quyền xem danh sách công trình</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang tải công trình...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Không thể tải danh sách công trình</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, mã, địa chỉ..."
          value={searchInput}
          onChangeText={handleSearchChange}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {SITE_STATUS_FILTER_OPTIONS.map((option) => {
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
          <Pressable
            onPress={() => {
              setSortDesc((prev) => !prev);
              setPage(0);
            }}
            style={styles.sortButton}
          >
            <Text style={styles.sortButtonText}>Tên {sortDesc ? '↓' : '↑'}</Text>
          </Pressable>
        </ScrollView>
      </View>

      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SiteListItem site={item} onPress={handlePress} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyTitle}>Không tìm thấy công trình</Text>
            <Text style={styles.emptyDesc}>Thử thay đổi từ khóa hoặc bộ lọc.</Text>
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
    </View>
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
    marginTop: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingTop: 4,
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
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  listContent: {
    paddingVertical: 8,
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
