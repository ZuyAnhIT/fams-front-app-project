import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NotificationItem as NotificationItemType } from '../types/Notification';
import {
  formatNotificationTime,
  getEventTypeIcon,
  getEventTypeLabel,
  isNotificationRead,
} from '../utils/notification.utils';

interface NotificationItemProps {
  notification: NotificationItemType;
  onPress: (notification: NotificationItemType) => void;
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const read = isNotificationRead(notification);
  const icon = getEventTypeIcon(notification.eventType);
  const typeLabel = getEventTypeLabel(notification.eventType);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        styles.container,
        !read && styles.unread,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.body}`}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  unread: {
    backgroundColor: '#F8FAFF',
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
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
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: '#94A3B8',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  titleUnread: {
    fontWeight: '700',
    color: '#0F172A',
  },
  body: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 6,
  },
});
