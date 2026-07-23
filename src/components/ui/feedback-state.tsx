import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '@/theme/tokens';

import { AppButton } from './app-button';

interface FeedbackStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function FeedbackState({ icon, title, description, actionLabel, onAction }: FeedbackStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={palette.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <AppButton label={actionLabel} onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: palette.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 420,
  },
  action: {
    marginTop: spacing.md,
    minWidth: 140,
  },
});
