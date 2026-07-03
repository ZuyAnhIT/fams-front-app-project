import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { AuthTheme } from '@/features/auth/theme';

interface ProfileSettingsRowProps {
  icon: string;
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
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
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
        <Text style={[styles.rowChevron, { color: theme.border }]}>›</Text>
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
    fontSize: 20,
    width: 28,
    textAlign: 'center',
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
  rowChevron: {
    fontSize: 22,
    fontWeight: '300',
  },
});
