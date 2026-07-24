import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { API_BASE_URL, AVATAR_UPLOAD_URL } from '@/config/env';
import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

export class AvatarUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarUploadError';
  }
}

/** Requests media-library permission and returns true when granted */
export async function requestAvatarPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/** Opens the image library and returns a local file URI */
export async function pickAvatarImage(): Promise<string> {
  const granted = await requestAvatarPermission();
  if (!granted) {
    throw new AvatarUploadError('Cần quyền truy cập thư viện ảnh để đổi avatar');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    throw new AvatarUploadError('Đã hủy chọn ảnh');
  }

  return result.assets[0].uri;
}

function getUploadEndpoint(): string {
  const configuredEndpoint = AVATAR_UPLOAD_URL || '/auth/profile/avatar';

  try {
    const apiOrigin = new URL(API_BASE_URL).origin;
    const uploadUrl = new URL(configuredEndpoint, API_BASE_URL);
    if (uploadUrl.origin !== apiOrigin) {
      throw new AvatarUploadError(
        'Endpoint upload avatar phải cùng origin với API để tránh làm lộ access token.',
      );
    }
    return configuredEndpoint;
  } catch (error) {
    if (error instanceof AvatarUploadError) throw error;
    throw new AvatarUploadError('Cấu hình endpoint upload avatar không hợp lệ');
  }
}

/** Uploads an avatar and returns the raw UserProfileResponse payload. */
export async function uploadAvatarImage(localUri: string): Promise<unknown> {
  const uploadEndpoint = getUploadEndpoint();

  const prepared = await manipulateAsync(localUri, [{ resize: { width: 1024 } }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });

  const formData = new FormData();
  formData.append('file', {
    uri: prepared.uri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data } = await apiClient.post(uploadEndpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapApiData(data);
}

/** Deletes the current avatar and returns the raw updated profile payload. */
export async function deleteAvatarImage(): Promise<unknown> {
  const { data } = await apiClient.delete(getUploadEndpoint());
  return unwrapApiData(data);
}

const DEVICE_ID_STORAGE_KEY = 'fams_device_id_v1';
let deviceIdPromise: Promise<string> | null = null;

function createDeviceId(): string {
  const model = (Device.modelName ?? Device.modelId ?? 'device')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${Platform.OS}-${model || 'device'}-${suffix}`;
}

/** Stable, installation-scoped identifier shown in the session-management UI. */
export function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const existing = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (existing) return existing;
      const created = createDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
      return created;
    })().catch((error) => {
      deviceIdPromise = null;
      throw error;
    });
  }
  return deviceIdPromise;
}
