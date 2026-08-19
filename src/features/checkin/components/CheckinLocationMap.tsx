import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polygon } from 'react-native-maps';

import { useGps } from '@/features/gps/hooks/use-gps';
import { palette, radius, spacing } from '@/theme/tokens';

import type { AvailableSite } from '../types/checkin.type';
import { distanceMeters } from '../utils/checkin.mapper';

export function CheckinLocationMap({ site }: { site: AvailableSite }) {
  const { isLocating, errorMessage, requestLocation } = useGps();
  const [current, setCurrent] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  useEffect(() => setCurrent(null), [site.assignmentId]);

  const polygon = useMemo(() => (site.geofence?.coordinates ?? [])
    .filter((pair) => pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    .map(([longitude, latitude]) => ({ latitude, longitude })), [site.geofence?.coordinates]);
  const center = site.site.latitude != null && site.site.longitude != null
    ? { latitude: site.site.latitude, longitude: site.site.longitude }
    : polygon[0] ?? null;
  if (!center) return null;

  const distance = current && site.site.latitude != null && site.site.longitude != null
    ? Math.round(distanceMeters(current.latitude, current.longitude, site.site.latitude, site.site.longitude))
    : null;
  // #130 (2026-08-18): AC calls for warning the employee about low GPS accuracy before they
  // check in — previously accuracy was only shown as a plain number, no threshold/warning.
  // 50m mirrors the backend's own "medium risk" cutoff (CheckinService GPS risk scoring) so the
  // warning shown here lines up with what would actually get flagged for HR review server-side.
  const lowAccuracy = current?.accuracy != null && current.accuracy > 50;
  const locate = async () => {
    const coords = await requestLocation();
    if (coords) setCurrent(coords);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}><Text style={styles.title}>Vị trí và vùng chấm công</Text><Text style={styles.subtitle}>{current ? `${distance != null ? `Cách tâm site khoảng ${distance} m · ` : ''}độ chính xác ±${Math.round(current.accuracy ?? 0)} m` : 'Xem vị trí của bạn so với geofence trước khi chấm công.'}</Text></View>
        <Pressable onPress={() => void locate()} disabled={isLocating} style={styles.locateButton} accessibilityRole="button" accessibilityLabel="Cập nhật vị trí hiện tại">
          {isLocating ? <ActivityIndicator size="small" color={palette.primary} /> : <Ionicons name="locate-outline" size={20} color={palette.primary} />}
        </Pressable>
      </View>
      <MapView
        key={site.assignmentId}
        style={styles.map}
        initialRegion={{ ...center, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
        showsCompass
        showsMyLocationButton={false}
      >
        <Marker coordinate={center} title={site.site.name} description={site.site.address ?? undefined} pinColor={palette.primary} />
        {polygon.length >= 3 && <Polygon coordinates={polygon} strokeColor={palette.primary} fillColor="rgba(37,99,235,0.14)" strokeWidth={2} />}
        {current && <><Marker coordinate={current} title="Vị trí của bạn" pinColor={palette.success} />{current.accuracy != null && current.accuracy > 0 && <Circle center={current} radius={current.accuracy} strokeColor="rgba(22,163,74,0.7)" fillColor="rgba(22,163,74,0.12)" />}</>}
      </MapView>
      <View style={styles.legend}><Text style={styles.legendText}>Xanh dương: geofence/site</Text><Text style={styles.legendText}>Xanh lá: vị trí hiện tại</Text></View>
      {lowAccuracy && (
        <View style={styles.accuracyWarning} accessibilityRole="alert">
          <Ionicons name="warning-outline" size={16} color={palette.warning} />
          <Text style={styles.accuracyWarningText}>
            Độ chính xác GPS thấp (±{Math.round(current!.accuracy!)} m) — hãy ra khu vực trống trải
            hơn hoặc chờ tín hiệu GPS ổn định trước khi chấm công để tránh bị đánh dấu chờ duyệt.
          </Text>
        </View>
      )}
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <Text style={styles.disclaimer}>Bản đồ chỉ hỗ trợ định hướng; Backend vẫn là nguồn quyết định vị trí hợp lệ.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1 },
  title: { color: palette.text, fontSize: 15, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 2 },
  locateButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  map: { width: '100%', height: 230, borderRadius: radius.lg },
  legend: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  legendText: { color: palette.textMuted, fontSize: 10 },
  error: { color: palette.danger, fontSize: 12, lineHeight: 18 },
  accuracyWarning: { flexDirection: 'row', gap: spacing.sm, backgroundColor: palette.warningSoft, borderRadius: radius.md, padding: spacing.md },
  accuracyWarningText: { flex: 1, color: palette.text, fontSize: 11, lineHeight: 16 },
  disclaimer: { color: palette.textMuted, fontSize: 10, lineHeight: 15 },
});
