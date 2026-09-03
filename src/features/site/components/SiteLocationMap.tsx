import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface SiteLocationMapProps {
  name: string;
  latitude: number;
  longitude: number;
  geofenceBufferMeters?: number;
}

/**
 * Site location preview. #16: switched off `react-native-maps` (blank on Expo Go, needs a
 * Google Maps API key on real builds) to an OpenStreetMap (Leaflet) map in a WebView — no
 * API key, works everywhere the same way, and the web build now shows a real map too.
 */
export function SiteLocationMap({ name, latitude, longitude, geofenceBufferMeters }: SiteLocationMapProps) {
  const cfg = JSON.stringify({ center: [latitude, longitude], name, buffer: geofenceBufferMeters ?? 0 });
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}#map{background:#e9eef2}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var c = ${cfg};
  var map = L.map('map', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false }).setView(c.center, 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  L.marker(c.center).addTo(map).bindPopup(c.name);
  if (c.buffer > 0) {
    var circ = L.circle(c.center, { radius: c.buffer, color: '#2563eb', weight: 2, fillOpacity: 0.15 }).addTo(map);
    try { map.fitBounds(circ.getBounds().pad(0.25)); } catch (e) {}
  }
</script></body></html>`;

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={styles.loading} color="#2563EB" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 180, borderRadius: 10, marginVertical: 8, overflow: 'hidden', backgroundColor: '#e9eef2' },
  map: { flex: 1, backgroundColor: 'transparent' },
  loading: { flex: 1, alignSelf: 'center' },
});
