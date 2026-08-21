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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, spacing } from '@/theme/tokens';

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
    const normalized = value.trim();
    if (!normalized) {
      setSearch('');
      setPage(0);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearch(normalized);
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

  const { sites, totalPages, totalElements, isLoading, isRefetching, isError, isForbidden, refetch } =
    useSiteList(params);

  useEffect(() => {
    if (!isLoading && page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [isLoading, page, totalPages]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

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
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Công trình" onBack={goBack} />
        <FeedbackState
          icon="lock-closed-outline"
          title="Bạn chưa được cấp quyền xem công trình"
          description="Liên hệ quản trị viên nếu bạn cần truy cập thông tin này."
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Công trình" onBack={goBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Đang tải công trình...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Công trình" onBack={goBack} />
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể tải danh sách công trình"
          description="Kiểm tra kết nối mạng rồi thử lại."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title="Công trình"
        subtitle={`${totalElements} kết quả${totalPages > 1 ? ` · trang ${page + 1}/${totalPages}` : ''}`}
        onBack={goBack}
      />
      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, mã, địa chỉ..."
          placeholderTextColor={palette.textMuted}
          value={searchInput}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Tìm kiếm công trình"
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
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
            accessibilityRole="button"
            accessibilityLabel={`Sắp xếp tên ${sortDesc ? 'giảm dần' : 'tăng dần'}`}
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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <FeedbackState
            icon="business-outline"
            title="Không tìm thấy công trình"
            description="Thử thay đổi từ khóa hoặc bộ lọc."
          />
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                disabled={page === 0}
                onPress={() => setPage((p) => Math.max(0, p - 1))}
                style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Trang trước"
                accessibilityState={{ disabled: page === 0 }}
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
                accessibilityRole="button"
                accessibilityLabel="Trang sau"
                accessibilityState={{ disabled: page >= totalPages - 1 }}
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
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  toolbar: {
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    paddingBottom: 8,
    gap: 8,
  },
  searchInput: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingHorizontal: 12,
    minHeight: 44,
    paddingVertical: 8,
    color: palette.text,
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
    backgroundColor: palette.surfaceMuted,
    minHeight: 40,
    justifyContent: 'center',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortButton: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: palette.surfaceBrand,
    minHeight: 40,
    justifyContent: 'center',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primary,
  },
  listContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
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
    minHeight: 44,
    justifyContent: 'center',
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
