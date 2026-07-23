import * as Device from 'expo-device';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

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

function normalizeAvatarUrl(rawUrl: string): string {
  let resolved: URL;
  try {
    resolved = new URL(rawUrl, API_BASE_URL);
  } catch {
    throw new AvatarUploadError('Máy chủ upload trả về URL không hợp lệ');
  }

  if (resolved.protocol !== 'https:' && !(__DEV__ && resolved.protocol === 'http:')) {
    throw new AvatarUploadError('Avatar phải được phục vụ qua HTTPS');
  }
  return resolved.toString();
}

function getUploadEndpoint(): string {
  if (!AVATAR_UPLOAD_URL) {
    throw new AvatarUploadError(
      'Chưa cấu hình endpoint upload avatar. Vui lòng liên hệ quản trị hệ thống.',
    );
  }

  try {
    const apiOrigin = new URL(API_BASE_URL).origin;
    const uploadUrl = new URL(AVATAR_UPLOAD_URL, API_BASE_URL);
    if (uploadUrl.origin !== apiOrigin) {
      throw new AvatarUploadError(
        'Endpoint upload avatar phải cùng origin với API để tránh làm lộ access token.',
      );
    }
    return AVATAR_UPLOAD_URL;
  } catch (error) {
    if (error instanceof AvatarUploadError) throw error;
    throw new AvatarUploadError('Cấu hình endpoint upload avatar không hợp lệ');
  }
}

/** Uploads an avatar through the configured authenticated backend endpoint. */
export async function uploadAvatarImage(localUri: string): Promise<string> {
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
  const payload = unwrapApiData<
    | string
    | { url?: string; avatarUrl?: string; avatar_url?: string }
  >(data);

  const rawUrl =
    typeof payload === 'string'
      ? payload
      : payload.url ?? payload.avatarUrl ?? payload.avatar_url;
  if (!rawUrl) {
    throw new AvatarUploadError('Máy chủ upload không trả về URL avatar');
  }
  return normalizeAvatarUrl(rawUrl.trim());
}

/** Stable device identifier sent with Google login */
export function getDeviceId(): string {
  return Device.osBuildId ?? Device.modelId ?? Device.modelName ?? 'fams-mobile';
}
