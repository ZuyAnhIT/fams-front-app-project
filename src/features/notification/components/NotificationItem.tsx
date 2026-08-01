import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/theme/tokens';

import type { NotificationItem as NotificationItemType } from '../types/Notification';
import {
  formatNotificationTime,
  getEventTypeLabel,
  isRandomCheckNotification,
  isNotificationRead,
} from '../utils/notification.utils';

interface NotificationItemProps {
  notification: NotificationItemType;
  onPress: (notification: NotificationItemType) => void;
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const read = isNotificationRead(notification);
  const typeLabel = getEventTypeLabel(notification.eventType);
  const normalizedEventType = notification.eventType.toLowerCase();
  const opensRelatedScreen = isRandomCheckNotification(notification.eventType) || ['assignment', 'checkin', 'attendance'].includes(normalizedEventType);
  const icon: keyof typeof Ionicons.glyphMap = {
    random_check: 'dice-outline',
    violation: 'warning-outline',
    system_alert: 'notifications-outline',
    assignment: 'clipboard-outline',
    checkin: 'checkmark-circle-outline',
    attendance: 'stats-chart-outline',
    random_check_sent: 'dice-outline',
  }[normalizedEventType] as keyof typeof Ionicons.glyphMap ?? 'notifications-outline';

  return (
    <Pressable
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        styles.container,
        !read && styles.unread,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${read ? '' : 'Chưa đọc. '}${notification.title}. ${notification.body}`}
      accessibilityHint={
        opensRelatedScreen
          ? 'Mở nội dung liên quan'
          : read
            ? 'Thông báo đã đọc'
            : 'Đánh dấu thông báo là đã đọc'
      }
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={21} color={palette.primary} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
          <Text style={styles.time}>{formatNotificationTime(notification.createdAt)}</Text>
        </View>

        <Text style={[styles.title, !read && styles.titleUnread]} numberOfLines={1}>
          {notification.title}
        </Text>

        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>

      {!read && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  unread: {
    backgroundColor: palette.surfaceBrand,
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: palette.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: palette.textSecondary,
  },
  titleUnread: {
    fontWeight: '700',
    color: palette.text,
  },
  body: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
    marginTop: 6,
  },
});
