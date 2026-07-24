import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { AuthTheme } from '@/features/auth/hooks/use-auth-theme';

interface ProfileSettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
  loading?: boolean;
  theme: AuthTheme;
}

export function ProfileSettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  destructive = false,
  loading = false,
  theme,
}: ProfileSettingsRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={20} color={destructive ? theme.error : theme.textSecondary} />
        </View>
        <View style={styles.rowTexts}>
          <Text style={[styles.rowLabel, { color: destructive ? theme.error : theme.text }]}>
            {label}
          </Text>
          {sublabel && (
            <Text style={[styles.rowSublabel, { color: theme.textMuted }]}>{sublabel}</Text>
          )}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.textMuted} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.border} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSublabel: {
    fontSize: 12,
  },
});
