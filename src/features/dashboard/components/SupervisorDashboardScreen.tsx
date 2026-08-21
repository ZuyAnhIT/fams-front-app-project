import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, radius, spacing } from '@/theme/tokens';
import { useSitePresenceReport, type SitePresenceEntry } from '@/features/report/site-presence';
import { useIsCurrentTenantSupervisor, useSupervisorDashboard } from '../hooks/use-dashboard';
import type { SupervisedSiteStatus } from '../types/dashboard.type';

function time(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function SiteCard({ site, presence }: { site: SupervisedSiteStatus; presence?: SitePresenceEntry }) {
  const assigned = presence?.assignedCount ?? site.expectedToday;
  const present = presence?.presentCount ?? site.onSiteNow;
  const absent = presence?.absentCount ?? Math.max(0, assigned - present);
  const ratio = assigned > 0 ? Math.min(1, present / assigned) : 0;
  return (
    <View style={styles.card}>
      <View style={styles.siteHeader}>
        <View style={styles.siteIcon}><Ionicons name="business-outline" size={21} color={palette.primary} /></View>
        <View style={styles.siteCopy}>
          <Text style={styles.siteName}>{site.siteName}</Text>
          <Text style={styles.siteCount}>{present}/{assigned} nhân viên đang có mặt · {absent} chưa có mặt</Text>
        </View>
      </View>
      <View style={styles.track}><View style={[styles.progress, { width: `${ratio * 100}%` }]} /></View>
      {(site.randomCheckPending > 0 || site.unresolvedViolations > 0) && (
        <View style={styles.alertRow}>
          {site.randomCheckPending > 0 && (
            <View style={[styles.alertPill, styles.alertPillWarning]}>
              <Ionicons name="alert-circle-outline" size={14} color="#92400E" />
              <Text style={styles.alertPillWarningText}>{site.randomCheckPending} random check chờ phản hồi</Text>
            </View>
          )}
          {site.unresolvedViolations > 0 && (
            <View style={[styles.alertPill, styles.alertPillDanger]}>
              <Ionicons name="shield-outline" size={14} color="#991B1B" />
              <Text style={styles.alertPillDangerText}>{site.unresolvedViolations} vi phạm chưa xử lý</Text>
            </View>
          )}
        </View>
      )}
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
      <Text style={[styles.listTitle, styles.absentTitle]}>CHƯA CÓ MẶT</Text>
      {!presence || presence.absentEmployees.length === 0 ? (
        <Text style={styles.emptyText}>{presence ? 'Tất cả nhân viên được phân công đã có mặt.' : 'Chưa tải được danh sách nhân viên vắng mặt.'}</Text>
      ) : presence.absentEmployees.map((employee) => (
        <View key={employee.employeeId} style={styles.employeeRow}>
          <View style={[styles.avatar, styles.absentAvatar]}><Text style={styles.absentAvatarText}>{employee.employeeName.charAt(0).toUpperCase()}</Text></View>
          <View style={styles.employeeCopy}>
            <Text style={styles.employeeName}>{employee.employeeName}</Text>
            <Text style={styles.employeeMeta}>{employee.employeeCode || 'Chưa có mã nhân viên'}</Text>
          </View>
          <Ionicons name="time-outline" size={18} color={palette.warning} />
        </View>
      ))}
    </View>
  );
}

export function SupervisorDashboardScreen() {
  const role = useIsCurrentTenantSupervisor();
  const query = useSupervisorDashboard(role.isSupervisor);
  const presenceQuery = useSitePresenceReport(role.isSupervisor);
  const sites = query.data?.supervisedSites ?? [];
  const presenceBySite = new Map((presenceQuery.data?.sites.content ?? []).map((site) => [site.siteId, site]));
  const isMissingEmployee = (query.error as { response?: { status?: number } } | null)?.response?.status === 404;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <AppHeader title="Hiện trường của tôi" subtitle="Tự làm mới mỗi 60 giây" onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')} />
      {role.isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={palette.primary} /><Text style={styles.muted}>Đang xác minh quyền giám sát...</Text></View>
      ) : role.isError ? (
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể xác minh quyền giám sát"
          description="Kiểm tra kết nối rồi thử lại. Dữ liệu hiện trường chưa được tải để bảo vệ phạm vi công trình."
          actionLabel="Thử lại"
          onAction={() => void role.refetch()}
        />
      ) : !role.isSupervisor ? (
        <FeedbackState
          icon="lock-closed-outline"
          title="Bạn không có quyền mở màn hình này"
          description="Màn hình hiện trường chỉ dành cho Site Supervisor trong công ty đang chọn."
        />
      ) : query.isLoading || presenceQuery.isLoading ? (
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
          renderItem={({ item }) => <SiteCard site={item} presence={presenceBySite.get(item.siteId)} />}
          refreshControl={<RefreshControl refreshing={query.isRefetching || presenceQuery.isRefetching} onRefresh={() => { void query.refetch(); void presenceQuery.refetch(); }} tintColor={palette.primary} />}
          contentContainerStyle={[styles.list, sites.length === 0 && styles.emptyList]}
          ListHeaderComponent={presenceQuery.data ? <View style={styles.snapshot}><Text style={styles.snapshotTitle}>Hiện diện trong phạm vi phụ trách</Text><Text style={styles.snapshotValue}>{presenceQuery.data.totalPresent}/{presenceQuery.data.totalAssigned} có mặt · {presenceQuery.data.totalAbsent} thiếu</Text><Text style={styles.snapshotTime}>Snapshot {new Date(presenceQuery.data.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text></View> : presenceQuery.isError ? <View style={styles.reportWarning}><Text style={styles.reportWarningText}>Không tải được báo cáo hiện diện. Kéo xuống để thử lại.</Text></View> : null}
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
  snapshot: { backgroundColor: palette.primary, borderRadius: radius.xl, padding: spacing.lg },
  snapshotTitle: { color: '#DBEAFE', fontSize: 12, fontWeight: '700' },
  snapshotValue: { color: palette.white, fontSize: 20, fontWeight: '800', marginTop: spacing.xs },
  snapshotTime: { color: '#BFDBFE', fontSize: 11, marginTop: spacing.xs },
  reportWarning: { borderRadius: radius.md, backgroundColor: '#FEF3C7', padding: spacing.md },
  reportWarningText: { color: '#92400E', fontSize: 12 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  siteIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: palette.surfaceBrand, alignItems: 'center', justifyContent: 'center' },
  siteCopy: { flex: 1 },
  siteName: { color: palette.text, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  siteCount: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: palette.surfaceMuted, overflow: 'hidden', marginTop: spacing.lg },
  progress: { height: '100%', borderRadius: 4, backgroundColor: palette.success },
  alertRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  alertPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.md, paddingVertical: 4, paddingHorizontal: spacing.sm },
  alertPillWarning: { backgroundColor: '#FEF3C7' },
  alertPillWarningText: { color: '#92400E', fontSize: 11, fontWeight: '700' },
  alertPillDanger: { backgroundColor: '#FEE2E2' },
  alertPillDangerText: { color: '#991B1B', fontSize: 11, fontWeight: '700' },
  listTitle: { color: palette.textMuted, fontSize: 10, letterSpacing: 0.8, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  absentTitle: { color: palette.warning },
  emptyText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.primary, fontSize: 14, fontWeight: '800' },
  absentAvatar: { backgroundColor: '#FEF3C7' },
  absentAvatarText: { color: '#92400E', fontSize: 14, fontWeight: '800' },
  employeeCopy: { flex: 1 },
  employeeName: { color: palette.text, fontSize: 14, fontWeight: '700' },
  employeeMeta: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.success },
});
