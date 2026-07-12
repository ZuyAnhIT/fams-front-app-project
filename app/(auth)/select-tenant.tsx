import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSelectTenant } from '@/features/auth/hooks/use-select-tenant';
import { useAuthTheme } from '@/features/auth/theme';

/**
 * Tenant picker. Reached two ways: right after login when the account can
 * act in more than one tenant (backend has no single "current tenant"
 * concept), or pushed from Profile to switch companies without signing out.
 * Platform admins get tenant names (via GET /tenants); ordinary
 * multi-tenant users only get IDs, since they can't call the
 * tenant-detail endpoint.
 */
export default function SelectTenantScreen() {
  const theme = useAuthTheme();
  const { tenants, isLoading, isError, selectedId, select, confirm, isConfirming } =
    useSelectTenant();
  const canGoBack = router.canGoBack();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {canGoBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Chọn công ty</Text>
        <Text style={styles.subtitle}>
          Tài khoản của bạn có quyền truy cập nhiều hơn một công ty. Chọn một
          công ty để tiếp tục.
        </Text>

        {isLoading && <ActivityIndicator style={styles.spinner} />}
        {isError && <Text style={styles.errorText}>Không tải được danh sách công ty</Text>}

        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, selectedId === item.id && styles.itemSelected]}
              onPress={() => select(item.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.itemText} numberOfLines={1}>
                {item.name ?? item.id}
              </Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: theme.primary },
            (!selectedId || isConfirming) && { backgroundColor: theme.primaryDisabled },
          ]}
          onPress={confirm}
          disabled={!selectedId || isConfirming}
          activeOpacity={0.85}
        >
          {isConfirming ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Tiếp tục</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  spinner: {
    marginTop: 24,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  list: {
    gap: 10,
  },
  item: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  itemText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
