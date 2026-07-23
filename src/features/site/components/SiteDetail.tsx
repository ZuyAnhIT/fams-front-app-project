import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/ui/app-header';
import { AppButton } from '@/components/ui/app-button';
import { FeedbackState } from '@/components/ui/feedback-state';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { palette, radius, spacing } from '@/theme/tokens';

import { useSiteDetail } from '../hooks/use-site-detail';
import { SiteLocationMap } from './SiteLocationMap';
import { useSiteSupervisors } from '../hooks/use-site-supervisors';
import {
  SITE_STATUS_LABELS,
  formatCoordinates,
  formatGeofenceRadius,
  formatShiftTimeRange,
} from '../utils/site.utils';

export interface SiteDetailProps {
  siteId: string;
}

export function SiteDetail({ siteId }: SiteDetailProps) {
  const router = useRouter();
  const { detail, isLoading, isError, refetch } = useSiteDetail(siteId);
  const { supervisors, isLoading: isLoadingSupervisors } = useSiteSupervisors(siteId);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/site');
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Chi tiết công trình" onBack={goBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Đang tải công trình...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !detail) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Chi tiết công trình" onBack={goBack} />
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể tải chi tiết công trình"
          description="Kiểm tra kết nối mạng rồi thử lại."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  const { name, code, address, latitude, longitude, status, geofence, shifts, activeAssignmentCount } =
    detail;

  const hasCoordinates = latitude != null && longitude != null;
  const openExternalMap = () => {
    if (!hasCoordinates) return;
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
    <AppHeader title="Chi tiết công trình" subtitle={code ?? undefined} onBack={goBack} />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <ResponsiveContainer style={styles.responsiveContent}>
      <View style={styles.section}>
        <Text style={styles.code}>{code ?? '—'}</Text>
        <Text style={styles.name}>{name}</Text>
        {!!address && <Text style={styles.address}>{address}</Text>}
        <Text style={styles.status}>Trạng thái: {SITE_STATUS_LABELS[status]}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vị trí</Text>
        <Text style={styles.value}>{formatCoordinates(latitude, longitude)}</Text>

        {hasCoordinates && Platform.OS !== 'web' ? (
          <SiteLocationMap
            name={name}
            latitude={latitude}
            longitude={longitude}
            geofenceBufferMeters={geofence?.bufferMeters}
          />
        ) : hasCoordinates ? (
          <Text style={styles.muted}>Sử dụng nút bên dưới để mở vị trí trên bản đồ.</Text>
        ) : (
          <Text style={styles.muted}>Chưa có tọa độ để hiển thị bản đồ</Text>
        )}

        {hasCoordinates && (
          <AppButton
            label="Mở vị trí trên bản đồ"
            icon="map-outline"
            variant="secondary"
            onPress={openExternalMap}
          />
        )}

        {geofence ? (
          <View style={styles.geofenceRow}>
            <Text style={styles.value}>Phạm vi chấm công đang áp dụng</Text>
            <Text style={styles.muted}>Bán kính {formatGeofenceRadius(geofence.bufferMeters)}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Chưa thiết lập phạm vi chấm công GPS</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ca làm</Text>
        {shifts.length === 0 ? (
          <Text style={styles.muted}>Chưa có ca làm</Text>
        ) : (
          shifts.map((shift) => (
            <View key={shift.id} style={styles.geofenceRow}>
              <Text style={styles.value}>{shift.name}</Text>
              <Text style={styles.muted}>
                {formatShiftTimeRange(shift.startTime, shift.endTime)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phân công</Text>
        <Text style={styles.value}>{activeAssignmentCount} phân công đang hoạt động</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giám sát viên</Text>
        {isLoadingSupervisors ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : supervisors.length === 0 ? (
          <Text style={styles.muted}>Chưa có giám sát viên</Text>
        ) : (
          supervisors.map(({ assignment, name: supervisorName, isLoadingName }) => (
            <Text key={assignment.id} style={styles.value}>
              {isLoadingName ? 'Đang tải tên...' : (supervisorName ?? `Nhân viên ${assignment.employeeId}`)}
            </Text>
          ))
        )}
      </View>
      </ResponsiveContainer>
    </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  responsiveContent: { gap: spacing.lg },
  section: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  address: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  status: {
    fontSize: 13,
    color: palette.text,
    marginTop: 4,
  },
  value: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '600',
  },
  muted: {
    fontSize: 13,
    color: palette.textMuted,
  },
  geofenceRow: {
    marginTop: 6,
    gap: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
