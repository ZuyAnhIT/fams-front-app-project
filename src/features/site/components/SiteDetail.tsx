import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { isAxiosError } from 'axios';

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
  const { detail, isLoading, isError, error, refetch } = useSiteDetail(siteId);
  const {
    supervisors,
    isLoading: isLoadingSupervisors,
    isError: isSupervisorsError,
    error: supervisorsError,
    refetch: refetchSupervisors,
  } = useSiteSupervisors(siteId);

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
    const status = isAxiosError(error) ? error.response?.status : undefined;
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Chi tiết công trình" onBack={goBack} />
        <FeedbackState
          icon={status === 403 ? 'lock-closed-outline' : status === 404 ? 'business-outline' : 'cloud-offline-outline'}
          title={status === 403
            ? 'Bạn chưa được cấp quyền xem công trình'
            : status === 404
              ? 'Không tìm thấy công trình'
              : 'Không thể tải chi tiết công trình'}
          description={status === 403
            ? 'Quyền có thể đã thay đổi. Quay lại danh sách hoặc liên hệ quản trị viên.'
            : status === 404
              ? 'Công trình có thể đã bị xóa hoặc không còn thuộc công ty đang chọn.'
              : 'Kiểm tra kết nối mạng rồi thử lại.'}
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

        {hasCoordinates ? (
          <SiteLocationMap
            name={name}
            latitude={latitude}
            longitude={longitude}
            geofenceBufferMeters={geofence?.bufferMeters}
          />
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
        ) : isSupervisorsError ? (
          <View style={styles.inlineError}>
            <Text style={styles.muted}>
              {isAxiosError(supervisorsError) && supervisorsError.response?.status === 403
                ? 'Bạn không có quyền xem danh sách giám sát viên.'
                : 'Không thể tải danh sách giám sát viên.'}
            </Text>
            <AppButton label="Thử tải lại" variant="ghost" onPress={refetchSupervisors} />
          </View>
        ) : supervisors.length === 0 ? (
          <Text style={styles.muted}>Chưa có giám sát viên</Text>
        ) : (
          supervisors.map(({ assignment, name: supervisorName, isLoadingName, isNameError }) => (
            <Text key={assignment.id} style={styles.value}>
              {isLoadingName
                ? 'Đang tải tên...'
                : isNameError
                  ? 'Không tải được tên giám sát viên'
                  : (supervisorName ?? 'Giám sát viên chưa có tên')}
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
  inlineError: { alignItems: 'flex-start', gap: spacing.xs },
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
