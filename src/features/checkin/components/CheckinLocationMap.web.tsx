import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/theme/tokens';

import type { AvailableSite } from '../types/checkin.type';

/**
 * Web build of the check-in map. `react-native-maps` has no web implementation, so this used
 * to be just an "open in Google Maps" button — which read as "the map is broken" during web
 * QA (#15). It now embeds the real OpenStreetMap slippy map (no API key needed) framed on the
 * geofence, with a marker on the site centre.
 *
 * `.web.tsx` only ever runs under react-native-web, so a plain <iframe> renders as real DOM.
 */
export function CheckinLocationMap({ site }: { site: AvailableSite }) {
  const { latitude, longitude } = site.site;

  const embedUrl = useMemo(() => {
    if (latitude == null || longitude == null) return null;

    const ring = (site.geofence?.coordinates ?? []).filter(
      (pair) => pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]),
    );
    let minLat = latitude;
    let maxLat = latitude;
    let minLon = longitude;
    let maxLon = longitude;
    for (const [lon, lat] of ring) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
    const padLat = Math.max((maxLat - minLat) * 0.6, 0.0015);
    const padLon = Math.max((maxLon - minLon) * 0.6, 0.0015);
    const bbox = [minLon - padLon, minLat - padLat, maxLon + padLon, maxLat + padLat]
      .map((n) => n.toFixed(6))
      .join('%2C');

    return (
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
      `&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`
    );
  }, [latitude, longitude, site.geofence?.coordinates]);

  if (latitude == null || longitude == null) return null;

  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Vị trí và vùng chấm công</Text>
      <Text style={styles.subtitle}>
        {site.site.name}
        {site.geofence ? ` · bán kính geofence ${site.geofence.bufferMeters} m` : ''}
      </Text>

      {embedUrl ? (
        <iframe
          title={`Bản đồ ${site.site.name}`}
          src={embedUrl}
          loading="lazy"
          style={{
            width: '100%',
            height: 230,
            border: `1px solid ${palette.border}`,
            borderRadius: radius.lg,
          }}
        />
      ) : null}

      <Pressable onPress={() => void Linking.openURL(externalUrl)} style={styles.button}>
        <Text style={styles.buttonText}>Mở Google Maps</Text>
      </Pressable>
      <Text style={styles.disclaimer}>
        Bản đồ chỉ hỗ trợ định hướng; Backend vẫn là nguồn quyết định vị trí hợp lệ. Vị trí GPS
        thời gian thực hiển thị trên bản đồ tương tác của ứng dụng Android/iOS.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { color: palette.text, fontSize: 15, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  button: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: palette.primary, fontWeight: '700' },
  disclaimer: { color: palette.textMuted, fontSize: 10, lineHeight: 15 },
});
