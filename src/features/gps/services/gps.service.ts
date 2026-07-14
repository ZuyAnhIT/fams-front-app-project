import * as Location from 'expo-location';

import type { GpsPermissionStatus, GpsResult } from '../types/gps.type';

function mapPermissionStatus(status: Location.PermissionStatus): GpsPermissionStatus {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function getForegroundPermissionStatus(): Promise<GpsPermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return mapPermissionStatus(status);
}

export async function requestForegroundPermission(): Promise<GpsPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return mapPermissionStatus(status);
}

export async function getCurrentLocation(): Promise<GpsResult> {
  const permission = await requestForegroundPermission();
  if (permission !== 'granted') {
    return {
      status: 'permission_denied',
      message: 'Bạn cần cấp quyền vị trí để chấm công GPS.',
    };
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return {
      status: 'unavailable',
      message: 'Vui lòng bật dịch vụ định vị (GPS) trên thiết bị.',
    };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      status: 'success',
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Không thể lấy vị trí hiện tại.',
    };
  }
}
