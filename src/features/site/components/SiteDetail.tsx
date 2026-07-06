import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { useSiteDetail } from '../hooks/use-site-detail';
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
  const { detail, isLoading, isError, refetch } = useSiteDetail(siteId);
  const { supervisors, isLoading: isLoadingSupervisors } = useSiteSupervisors(siteId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang tải công trình...</Text>
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Không thể tải chi tiết công trình</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  const { name, code, address, latitude, longitude, status, geofence, shifts, activeAssignmentCount } =
    detail;

  const hasCoordinates = latitude != null && longitude != null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <MapView
            style={styles.map}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pointerEvents="none"
          >
            <Marker coordinate={{ latitude, longitude }} title={name} />
            {geofence && (
              <Circle
                center={{ latitude, longitude }}
                radius={geofence.bufferMeters}
                strokeColor="#2563EB"
                fillColor="rgba(37, 99, 235, 0.15)"
              />
            )}
          </MapView>
        ) : hasCoordinates ? (
          <Text style={styles.muted}>Bản đồ chưa hỗ trợ trên web, xem tọa độ ở trên</Text>
        ) : (
          <Text style={styles.muted}>Chưa có tọa độ để hiển thị bản đồ</Text>
        )}

        {geofence ? (
          <View style={styles.geofenceRow}>
            <Text style={styles.value}>Geofence đang hoạt động</Text>
            <Text style={styles.muted}>{formatGeofenceRadius(geofence.bufferMeters)}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Chưa có geofence đang hoạt động</Text>
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
    </ScrollView>
  );
}

const MAP_HEIGHT = Platform.select({ web: 0, default: 180 });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
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
    color: '#1E293B',
  },
  address: {
    fontSize: 14,
    color: '#475569',
  },
  status: {
    fontSize: 13,
    color: '#1E293B',
    marginTop: 4,
  },
  value: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  muted: {
    fontSize: 13,
    color: '#64748B',
  },
  geofenceRow: {
    marginTop: 6,
    gap: 2,
  },
  map: {
    height: MAP_HEIGHT,
    borderRadius: 10,
    marginVertical: 8,
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
