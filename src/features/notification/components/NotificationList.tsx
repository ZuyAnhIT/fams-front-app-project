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
import { NotificationItem } from './NotificationItem';

export function NotificationList() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);

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

  const { markAsRead, markAllAsRead, isMarkingAllRead } = useMarkAsRead();

  const handlePress = useCallback(
    (notification: NotificationItemType) => {
      if (!isNotificationRead(notification)) {
        markAsRead(notification.id);
      }

      if (notification.eventType === 'assignment') {
        router.push('/(tabs)/assignment');
      } else if (notification.eventType === 'checkin' || notification.eventType === 'attendance') {
        router.push('/(tabs)/checkin-history');
      }
    },
    [markAsRead, router],
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
        <Pressable
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
              <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
            )}
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, notifications.length === 0 && styles.emptyList]}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={handlePress} />
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
