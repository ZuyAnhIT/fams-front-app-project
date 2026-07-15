export type GpsPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface GpsLocationResult {
  status: 'success';
  coords: GpsCoordinates;
}

export interface GpsErrorResult {
  status: 'permission_denied' | 'unavailable' | 'error';
  message: string;
}

export type GpsResult = GpsLocationResult | GpsErrorResult;
