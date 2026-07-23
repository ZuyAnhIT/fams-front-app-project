import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { layout, palette, spacing } from '@/theme/tokens';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  right?: ReactNode;
}

export function AppHeader({ title, subtitle, onBack, onClose, right }: AppHeaderProps) {
  const action = onBack ?? onClose;
  const actionLabel = onBack ? 'Quay lại' : 'Đóng';
  const actionIcon = onBack ? 'chevron-back' : 'close';

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {action && (
          <Pressable
            onPress={action}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={4}
          >
            <Ionicons name={actionIcon} size={24} color={palette.text} />
          </Pressable>
        )}
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  side: {
    width: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: palette.surfaceMuted,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    color: palette.textMuted,
    textAlign: 'center',
  },
});
