import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { useAuthSessions } from '@/features/auth/hooks/use-auth-sessions';
import { useAuthTheme } from '@/features/auth/theme';
import type { AuthSession } from '@/features/auth/types';
import { shadows } from '@/theme/tokens';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';

function deviceLabel(session: AuthSession) {
  if (session.user_agent) {
    const source = session.user_agent.toLowerCase();
    if (source.includes('iphone') || source.includes('ios')) return 'iPhone / iOS';
    if (source.includes('android')) return 'Android';
    if (source.includes('chrome')) return 'Chrome';
    return session.user_agent;
  }
  return session.device_id;
}

export default function SessionsScreen() {
  const theme = useAuthTheme();
  const { formatDateTime } = useTenantPreferences();
  const [target, setTarget] = useState<AuthSession | null>(null);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const {
    sessions, isLoading, isRefetching, isError, error, refetch, revoke, revokePendingId,
    logoutOthers, isLoggingOutOthers,
  } = useAuthSessions();
  const otherCount = sessions.filter((item) => !item.current).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Thiết bị đăng nhập" subtitle={`${sessions.length} phiên hoạt động`} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      >
        <ResponsiveContainer style={styles.content}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : isError ? (
            <View style={[styles.empty, { backgroundColor: theme.card }]}>
              <Ionicons name="alert-circle-outline" size={42} color={theme.error} />
              <Text style={[styles.emptyText, { color: theme.text }]}>{error}</Text>
              <TouchableOpacity onPress={() => void refetch()}>
                <Text style={[styles.link, { color: theme.primary }]}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {sessions.map((session) => (
                <View key={session.id} style={[styles.card, { backgroundColor: theme.card }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name={session.current ? 'phone-portrait-outline' : 'desktop-outline'} size={24} color={theme.primary} />
                    <View style={styles.deviceText}>
                      <Text style={[styles.deviceName, { color: theme.text }]} numberOfLines={2}>{deviceLabel(session)}</Text>
                      {session.current && (
                        <Text style={[styles.current, { color: theme.success }]}>Thiết bị hiện tại</Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>Hoạt động gần nhất: {session.last_used_at ? formatDateTime(session.last_used_at) : 'Không rõ'}</Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>Địa chỉ IP: {session.ip_address || 'Không rõ'}</Text>
                  {!session.current && (
                    <TouchableOpacity
                      style={[styles.revoke, { borderColor: theme.errorBorder }]}
                      disabled={revokePendingId === session.id}
                      onPress={() => setTarget(session)}
                    >
                      {revokePendingId === session.id ? <ActivityIndicator size="small" color={theme.error} /> : <Text style={[styles.revokeText, { color: theme.error }]}>Thu hồi phiên</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {sessions.length === 0 && (
                <View style={[styles.empty, { backgroundColor: theme.card }]}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Không có phiên đăng nhập nào.</Text>
                </View>
              )}
              {otherCount > 0 && (
                <TouchableOpacity
                  style={[styles.logoutOthers, { backgroundColor: theme.error }]}
                  onPress={() => setConfirmOthers(true)}
                  disabled={isLoggingOutOthers}
                >
                  <Text style={styles.logoutText}>Đăng xuất {otherCount} thiết bị khác</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>

      <ConfirmDialog
        visible={!!target}
        title="Thu hồi phiên đăng nhập?"
        description="Thiết bị này sẽ phải đăng nhập lại."
        confirmLabel="Thu hồi"
        destructive
        loading={!!target && revokePendingId === target.id}
        onCancel={() => setTarget(null)}
        onConfirm={() => target && revoke(target.id, { onSuccess: () => setTarget(null) })}
      />
      <ConfirmDialog
        visible={confirmOthers}
        title="Đăng xuất các thiết bị khác?"
        description="Phiên trên thiết bị hiện tại vẫn được giữ lại."
        confirmLabel="Đăng xuất"
        destructive
        loading={isLoggingOutOthers}
        onCancel={() => setConfirmOthers(false)}
        onConfirm={() => logoutOthers(undefined, { onSuccess: () => setConfirmOthers(false) })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  content: { gap: 14 },
  card: { borderRadius: 18, padding: 18, gap: 9, ...shadows.card },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  deviceText: { flex: 1, gap: 3 },
  deviceName: { fontSize: 15, fontWeight: '700' },
  current: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 18 },
  revoke: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 8, marginTop: 4 },
  revokeText: { fontSize: 13, fontWeight: '700' },
  logoutOthers: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { padding: 28, borderRadius: 18, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  link: { fontSize: 14, fontWeight: '700' },
});
