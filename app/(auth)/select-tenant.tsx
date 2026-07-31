import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
 * Tenant picker. Reached right after a multi-company login or from Profile.
 * Entries come from active role assignments returned by GET /roles/me, so
 * every listed tenant is eligible for POST /auth/switch-tenant.
 */
export default function SelectTenantScreen() {
  const theme = useAuthTheme();
  const params = useLocalSearchParams<{ source?: string }>();
  const {
    tenants,
    isLoading,
    isError,
    errorMessage,
    selectedId,
    select,
    confirm,
    retry,
    isConfirming,
    activeTenantId,
  } = useSelectTenant();
  const canGoBack = params.source === 'profile' && router.canGoBack();

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
        {(isError || errorMessage) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {errorMessage ?? 'Không tải được danh sách công ty.'}
            </Text>
            <TouchableOpacity onPress={retry} hitSlop={8}>
              <Text style={[styles.retryText, { color: theme.primary }]}>Tải lại</Text>
            </TouchableOpacity>
          </View>
        )}

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
              <View style={styles.itemHeader}>
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.name ?? item.slug ?? item.id}
                </Text>
                {item.id === activeTenantId && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Đang dùng</Text>
                  </View>
                )}
              </View>
              {item.roleNames.length > 0 && (
                <Text style={styles.itemMeta}>{item.roleNames.join(' · ')}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyBox}>
                <Ionicons name="business-outline" size={34} color="#94A3B8" />
                <Text style={styles.emptyText}>
                  Tài khoản hiện không có công ty hoạt động để lựa chọn.
                </Text>
              </View>
            ) : null
          }
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
            <Text style={styles.primaryButtonText}>
              {activeTenantId ? 'Chuyển sang công ty này' : 'Tiếp tục'}
            </Text>
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
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
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
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  retryText: { fontSize: 13, fontWeight: '700' },
  list: {
    gap: 10,
  },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 19 },
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
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemMeta: { marginTop: 6, fontSize: 12, color: '#64748B' },
  activeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#DCFCE7',
  },
  activeBadgeText: { color: '#15803D', fontSize: 10, fontWeight: '800' },
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
