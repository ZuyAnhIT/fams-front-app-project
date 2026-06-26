import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TenantSetupWizard } from '@/features/tenant/components/TenantSetupWizard';

/**
 * Platform Admin screen – Onboarding Wizard để tạo một tenant mới.
 *
 * Quyền truy cập: chỉ Platform Admin (role = 'admin').
 * Navigate tới đây từ danh sách tenant hoặc sau khi đăng nhập platform admin.
 */
export default function TenantSetupScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>F</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Thiết lập công ty mới</Text>
            <Text style={styles.headerSub}>FAMS Platform Admin</Text>
          </View>
        </View>
      </View>

      {/* Wizard occupies remaining space */}
      <TenantSetupWizard onCancel={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMarkText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
});
