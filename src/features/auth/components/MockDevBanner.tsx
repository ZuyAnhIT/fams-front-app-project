import { StyleSheet, Text, View } from 'react-native';

import { USE_MOCK_API } from '@/config/env';
import { MOCK_CREDENTIALS_HINT } from '@/features/auth/mock/mock-data';

/**
 * Banner hiển thị tài khoản demo khi mock API đang bật.
 * Chỉ render trong dev/mock mode.
 */
export function MockDevBanner() {
  if (!USE_MOCK_API) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Mock API đang bật</Text>
      {MOCK_CREDENTIALS_HINT.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.label}>{item.label}:</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  value: {
    fontSize: 12,
    color: '#78350F',
    fontFamily: 'monospace',
  },
});
