import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, radius, spacing } from '@/theme/tokens';

import { useSupervisorDashboard } from '../hooks/use-dashboard';
import type { SupervisedSiteStatus } from '../types/dashboard.type';

function time(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function SiteCard({ site }: { site: SupervisedSiteStatus }) {
  const ratio = site.expectedToday > 0 ? Math.min(1, site.onSiteNow / site.expectedToday) : 0;
  return (
    <View style={styles.card}>
      <View style={styles.siteHeader}>
        <View style={styles.siteIcon}><Ionicons name="business-outline" size={21} color={palette.primary} /></View>
        <View style={styles.siteCopy}>
          <Text style={styles.siteName}>{site.siteName}</Text>
          <Text style={styles.siteCount}>{site.onSiteNow}/{site.expectedToday} nhân viên đang có mặt</Text>
        </View>
      </View>
      <View style={styles.track}><View style={[styles.progress, { width: `${ratio * 100}%` }]} /></View>
      <Text style={styles.listTitle}>ĐANG CÓ MẶT</Text>
      {site.onSiteEmployees.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có nhân viên check-in tại công trình hôm nay.</Text>
      ) : site.onSiteEmployees.map((employee) => (
        <View key={employee.employeeId} style={styles.employeeRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(employee.lastName || employee.firstName || 'N').charAt(0).toUpperCase()}</Text></View>
          <View style={styles.employeeCopy}>
            <Text style={styles.employeeName}>{[employee.lastName, employee.firstName].filter(Boolean).join(' ')}</Text>
            <Text style={styles.employeeMeta}>{employee.employeeCode || 'Chưa có mã'} · vào lúc {time(employee.checkInAt)}</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
      ))}
    </View>
  );
}

export function SupervisorDashboardScreen() {
  const query = useSupervisorDashboard();
  const sites = query.data?.supervisedSites ?? [];
  const isMissingEmployee = (query.error as { response?: { status?: number } } | null)?.response?.status === 404;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <AppHeader title="Hiện trường của tôi" subtitle="Tự làm mới mỗi 60 giây" onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')} />
      {query.isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={palette.primary} /><Text style={styles.muted}>Đang tải tình hình công trình...</Text></View>
      ) : query.isError ? (
        <FeedbackState
          icon={isMissingEmployee ? "person-remove-outline" : "cloud-offline-outline"}
          title={isMissingEmployee ? "Tài khoản chưa có hồ sơ nhân viên" : "Không thể tải dashboard giám sát"}
          description={isMissingEmployee ? "Liên hệ HR để liên kết tài khoản với hồ sơ nhân viên trong công ty hiện tại." : "Kiểm tra kết nối rồi thử lại."}
          actionLabel="Thử lại"
          onAction={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={sites}
          keyExtractor={(item) => item.siteId}
          renderItem={({ item }) => <SiteCard site={item} />}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={palette.primary} />}
          contentContainerStyle={[styles.list, sites.length === 0 && styles.emptyList]}
          ListEmptyComponent={<FeedbackState icon="calendar-outline" title="Chưa có công trình giám sát hôm nay" description="Đây là trạng thái bình thường khi bạn chưa có assignment supervisor đang hiệu lực trong ngày." />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  muted: { color: palette.textMuted, fontSize: 14 },
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  emptyList: { flexGrow: 1 },
  card: { backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, padding: spacing.lg },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  siteIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: palette.surfaceBrand, alignItems: 'center', justifyContent: 'center' },
  siteCopy: { flex: 1 },
  siteName: { color: palette.text, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  siteCount: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: palette.surfaceMuted, overflow: 'hidden', marginTop: spacing.lg },
  progress: { height: '100%', borderRadius: 4, backgroundColor: palette.success },
  listTitle: { color: palette.textMuted, fontSize: 10, letterSpacing: 0.8, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  emptyText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.primary, fontSize: 14, fontWeight: '800' },
  employeeCopy: { flex: 1 },
  employeeName: { color: palette.text, fontSize: 14, fontWeight: '700' },
  employeeMeta: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.success },
});
