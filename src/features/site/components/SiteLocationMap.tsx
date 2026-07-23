import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

export interface SiteLocationMapProps {
  name: string;
  latitude: number;
  longitude: number;
  geofenceBufferMeters?: number;
}

/**
 * Native-only (iOS/Android) map preview. Kept in a `.native.tsx` file so Metro
 * never resolves `react-native-maps` for the web bundle — that package
 * imports React Native internals that don't exist on web and break the
 * entire web build if statically imported from a shared file.
 */
export function SiteLocationMap({ name, latitude, longitude, geofenceBufferMeters }: SiteLocationMapProps) {
  return (
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
      {geofenceBufferMeters != null && (
        <Circle
          center={{ latitude, longitude }}
          radius={geofenceBufferMeters}
          strokeColor="#2563EB"
          fillColor="rgba(37, 99, 235, 0.15)"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 180,
    borderRadius: 10,
    marginVertical: 8,
  },
});
