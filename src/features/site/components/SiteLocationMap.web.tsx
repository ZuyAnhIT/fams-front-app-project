export interface SiteLocationMapProps {
  name: string;
  latitude: number;
  longitude: number;
  geofenceBufferMeters?: number;
}

/**
 * Web has no `react-native-maps` support, so this build stays a no-op —
 * SiteDetail.tsx renders a link to open the coordinates in an external map
 * when this returns null. Kept as a real component (not just skipping
 * the import) so `./SiteLocationMap` resolves identically on both platforms.
 */
export function SiteLocationMap(_props: SiteLocationMapProps) {
  return null;
}
