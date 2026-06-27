import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useUnreadCount } from '../hooks/useUnreadCount';

interface NotificationBadgeProps {
  style?: ViewStyle;
  /** Hiển thị badge ngay cả khi count = 0 (dùng cho tab icon wrapper). */
  showZero?: boolean;
}

export function NotificationBadge({ style, showZero = false }: NotificationBadgeProps) {
  const { unreadCount } = useUnreadCount();

  if (!showZero && unreadCount <= 0) return null;

  const label = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
