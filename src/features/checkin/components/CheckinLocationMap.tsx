import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useGps } from '@/features/gps/hooks/use-gps';
import { palette, radius, spacing } from '@/theme/tokens';

import type { AvailableSite } from '../types/checkin.type';
import { distanceMeters } from '../utils/checkin.mapper';

/**
 * Check-in location map. #16: this used `react-native-maps`, which renders a blank grey tile
 * on Expo Go (SDK 53+ dropped it) and needs a working Google Maps API key on real builds. It
 * now renders an OpenStreetMap (Leaflet) map inside a WebView — no API key, identical behaviour
 * on Expo Go / dev client / production, and consistent with the web build's OSM map.
 */
export function CheckinLocationMap({ site }: { site: AvailableSite }) {
  const { isLocating, errorMessage, requestLocation } = useGps();
  const [current, setCurrent] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);

  const polygon = useMemo(
    () =>
      (site.geofence?.coordinates ?? [])
        .filter((pair) => pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
        .map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
    [site.geofence?.coordinates],
  );

  const center = useMemo(() => {
    if (site.site.latitude != null && site.site.longitude != null) {
      return { latitude: site.site.latitude, longitude: site.site.longitude };
    }
    return polygon[0] ? { latitude: polygon[0][0], longitude: polygon[0][1] } : null;
  }, [site.site.latitude, site.site.longitude, polygon]);

  const html = useMemo(() => {
    if (!center) return null;
    const cfg = JSON.stringify({
      center: [center.latitude, center.longitude],
      name: site.site.name ?? 'Công trình',
      polygon,
      bufferMeters: site.geofence?.bufferMeters ?? 0,
      current: current ? [current.latitude, current.longitude] : null,
      accuracy: current?.accuracy ?? null,
    });
    return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}#map{background:#e9eef2}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var c = ${cfg};
  var map = L.map('map', { zoomControl: true }).setView(c.center, 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  var siteMarker = L.marker(c.center).addTo(map).bindPopup(c.name);
  var group = [siteMarker];
  if (c.polygon && c.polygon.length >= 3) {
    group.push(L.polygon(c.polygon, { color: '#2563eb', weight: 2, fillOpacity: 0.14 }).addTo(map));
  } else if (c.bufferMeters > 0) {
    group.push(L.circle(c.center, { radius: c.bufferMeters, color: '#2563eb', weight: 2, fillOpacity: 0.12 }).addTo(map));
  }
  if (c.current) {
    group.push(L.circleMarker(c.current, { radius: 7, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 }).addTo(map).bindPopup('Vị trí của bạn'));
    if (c.accuracy && c.accuracy > 0) L.circle(c.current, { radius: c.accuracy, color: '#16a34a', weight: 1, fillOpacity: 0.1 }).addTo(map);
  }
  try { map.fitBounds(L.featureGroup(group).getBounds().pad(0.3)); } catch (e) {}
</script></body></html>`;
  }, [center, polygon, site.geofence?.bufferMeters, site.site.name, current]);

  if (!center || !html) return null;

  const distance =
    current && site.site.latitude != null && site.site.longitude != null
      ? Math.round(distanceMeters(current.latitude, current.longitude, site.site.latitude, site.site.longitude))
      : null;
  const lowAccuracy = current?.accuracy != null && current.accuracy > 50;

  const locate = async () => {
    const coords = await requestLocation();
    if (coords) setCurrent(coords);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>Vị trí và vùng chấm công</Text>
          <Text style={styles.subtitle} accessibilityLiveRegion="polite">
            {current
              ? `${distance != null ? `Cách tâm site khoảng ${distance} m · ` : ''}độ chính xác ±${Math.round(current.accuracy ?? 0)} m`
              : 'Xem vị trí của bạn so với geofence trước khi chấm công.'}
          </Text>
        </View>
        <Pressable onPress={() => void locate()} disabled={isLocating} style={styles.locateButton} accessibilityRole="button" accessibilityLabel="Cập nhật vị trí hiện tại">
          {isLocating ? <ActivityIndicator size="small" color={palette.primary} /> : <Ionicons name="locate-outline" size={20} color={palette.primary} />}
        </Pressable>
      </View>

      <View style={styles.mapWrap}>
        <WebView
          key={`${site.assignmentId}-${current ? 'me' : 'nome'}`}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
          scrollEnabled={false}
          androidLayerType="hardware"
          setSupportMultipleWindows={false}
          renderLoading={() => <ActivityIndicator style={styles.mapLoading} color={palette.primary} />}
          startInLoadingState
        />
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Xanh dương: geofence/site</Text>
        <Text style={styles.legendText}>Xanh lá: vị trí hiện tại</Text>
      </View>

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
  mapWrap: { width: '100%', height: 230, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, backgroundColor: '#e9eef2' },
  map: { flex: 1, backgroundColor: 'transparent' },
  mapLoading: { flex: 1, alignSelf: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  legendText: { color: palette.textMuted, fontSize: 10 },
  error: { color: palette.danger, fontSize: 12, lineHeight: 18 },
  accuracyWarning: { flexDirection: 'row', gap: spacing.sm, backgroundColor: palette.warningSoft, borderRadius: radius.md, padding: spacing.md },
  accuracyWarningText: { flex: 1, color: palette.text, fontSize: 11, lineHeight: 16 },
  disclaimer: { color: palette.textMuted, fontSize: 10, lineHeight: 15 },
});
