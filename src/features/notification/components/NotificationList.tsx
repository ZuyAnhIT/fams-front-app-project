import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, radius, spacing } from '@/theme/tokens';

import { useMarkAsRead } from '../hooks/useMarkAsRead';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationItem as NotificationItemType } from '../types/Notification';
import { isNotificationRead } from '../utils/notification.utils';
import { resolveNotificationHref } from '../utils/notification-navigation';
import { NotificationItem } from './NotificationItem';

export function NotificationList() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    notifications,
    unreadCount,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useNotifications({ unreadOnly });

  const { markAsRead, markAllAsRead, markSelectedAsRead, isMarkingAllRead, isMarkingSelectedRead } = useMarkAsRead();

  const toggleSelection = useCallback((notification: NotificationItemType) => {
    if (isNotificationRead(notification)) return;
    setSelectionMode(true);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(notification.id)) next.delete(notification.id);
      else next.add(notification.id);
      return next;
    });
  }, []);

  const handlePress = useCallback(
    (notification: NotificationItemType) => {
      if (selectionMode) {
        toggleSelection(notification);
        return;
      }
      if (!isNotificationRead(notification)) {
        markAsRead(notification.id);
      }

      const href = resolveNotificationHref(notification.eventType, notification.metadata);
      if (href) router.push(href);
    },
    [markAsRead, router, selectionMode, toggleSelection],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const hasUnread = unreadCount > 0;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Đang tải thông báo...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <FeedbackState
        icon="cloud-offline-outline"
        title="Không thể tải thông báo"
        description="Kiểm tra kết nối mạng rồi thử lại."
        actionLabel="Thử lại"
        onAction={refetch}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {selectionMode ? (
          <View style={styles.selectionToolbar}>
            <Pressable onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }} style={styles.toolbarButton} accessibilityRole="button">
              <Text style={styles.toolbarButtonText}>Huỷ</Text>
            </Pressable>
            <Text style={styles.selectionCount}>Đã chọn {selectedIds.size}</Text>
            <Pressable
              onPress={() => {
                const unreadIds = notifications.filter((item) => !isNotificationRead(item)).map((item) => item.id);
                setSelectedIds(new Set(unreadIds));
              }}
              style={styles.toolbarButton}
              accessibilityRole="button"
              accessibilityLabel="Chọn tất cả thông báo chưa đọc đã tải"
            >
              <Text style={styles.toolbarButtonText}>Chọn đã tải</Text>
            </Pressable>
            <Pressable
              onPress={() => void (async () => {
                try {
                  await markSelectedAsRead([...selectedIds]);
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                } catch {
                  // Keep the selection so the user can retry after the hook shows the error.
                }
              })()}
              disabled={selectedIds.size === 0 || isMarkingSelectedRead}
              style={[styles.markSelectedButton, selectedIds.size === 0 && styles.disabledButton]}
              accessibilityRole="button"
              accessibilityLabel="Đánh dấu các thông báo đã chọn là đã đọc"
              accessibilityState={{ disabled: selectedIds.size === 0 || isMarkingSelectedRead, busy: isMarkingSelectedRead }}
            >
              {isMarkingSelectedRead ? <ActivityIndicator size="small" color={palette.white} /> : <Text style={styles.markSelectedText}>Đã đọc</Text>}
            </Pressable>
          </View>
        ) : <><Pressable
          onPress={() => setUnreadOnly((prev) => !prev)}
          style={[styles.filterChip, unreadOnly && styles.filterChipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: unreadOnly }}
        >
          <Text style={[styles.filterChipText, unreadOnly && styles.filterChipTextActive]}>
            Chưa đọc
          </Text>
        </Pressable>

        {hasUnread && (
          <View style={styles.defaultActions}>
            <Pressable onPress={() => setSelectionMode(true)} style={styles.markAllButton} accessibilityRole="button">
              <Text style={styles.markAllText}>Chọn</Text>
            </Pressable>
            <Pressable
            onPress={() => markAllAsRead()}
            disabled={isMarkingAllRead}
            style={styles.markAllButton}
            accessibilityRole="button"
            accessibilityLabel="Đánh dấu tất cả thông báo là đã đọc"
            accessibilityState={{ disabled: isMarkingAllRead, busy: isMarkingAllRead }}
          >
            {isMarkingAllRead ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Text style={styles.markAllText}>Đọc tất cả</Text>
            )}
            </Pressable>
          </View>
        )}</>}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, notifications.length === 0 && styles.emptyList]}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={handlePress}
            onLongPress={toggleSelection}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <FeedbackState
            icon={unreadOnly ? 'checkmark-done-outline' : 'notifications-outline'}
            title={unreadOnly ? 'Bạn đã đọc tất cả thông báo' : 'Chưa có thông báo'}
            description={
              unreadOnly
                ? 'Thông báo chưa đọc mới sẽ xuất hiện tại đây.'
                : 'Các cập nhật về chấm công và phân công sẽ xuất hiện tại đây.'
            }
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={palette.primary} />
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
    backgroundColor: palette.canvas,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingBottom: spacing.xxxl,
  },
  emptyList: { flexGrow: 1 },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: palette.surfaceMuted,
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
  markAllButton: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  defaultActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectionToolbar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectionCount: { flex: 1, color: palette.text, fontSize: 13, fontWeight: '700' },
  toolbarButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xs },
  toolbarButtonText: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  markSelectedButton: { minHeight: 38, minWidth: 66, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  markSelectedText: { color: palette.white, fontSize: 12, fontWeight: '700' },
  disabledButton: { opacity: 0.45 },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primary,
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
