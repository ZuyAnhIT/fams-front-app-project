import { StyleSheet, View } from 'react-native';

export interface SiteLocationMapProps {
  name: string;
  latitude: number;
  longitude: number;
  geofenceBufferMeters?: number;
}

/**
 * Web build: embeds the real OpenStreetMap slippy map (no API key). `.web.tsx` runs under
 * react-native-web, so a plain <iframe> renders as real DOM. (#16)
 */
export function SiteLocationMap({ name, latitude, longitude }: SiteLocationMapProps) {
  const d = 0.004;
  const bbox = [longitude - d, latitude - d, longitude + d, latitude + d].map((n) => n.toFixed(6)).join('%2C');
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
    `&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
  return (
    <View style={styles.wrap}>
      <iframe title={`Bản đồ ${name}`} src={src} loading="lazy" style={{ width: '100%', height: 180, border: '1px solid #e2e8f0', borderRadius: 10 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
});
