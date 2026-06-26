import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';

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

/**
 * Uploads a local image to a temporary public host and returns an HTTPS URL
 * suitable for PATCH /auth/me `avatarUrl`.
 */
export async function uploadAvatarImage(localUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', {
    uri: localUri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new AvatarUploadError('Không thể tải ảnh lên. Vui lòng thử lại.');
  }

  const url = (await response.text()).trim();
  if (!url.startsWith('https://')) {
    throw new AvatarUploadError('Máy chủ lưu trữ trả về URL không hợp lệ');
  }

  return url;
}

/** Stable device identifier sent with Google login */
export function getDeviceId(): string {
  return Device.osBuildId ?? Device.modelId ?? Device.modelName ?? 'fams-mobile';
}
