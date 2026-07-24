function getApiBaseUrl(): string {
  const value =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    'http://localhost:8080/api/v1';

  if (/\s/.test(value)) {
    throw new Error(
      'EXPO_PUBLIC_API_URL không hợp lệ: URL không được chứa khoảng trắng.',
    );
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error(
      'EXPO_PUBLIC_API_URL không hợp lệ. Ví dụ: http://192.168.1.155:8080/api/v1',
    );
  }

  return value.replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Authenticated backend/object-storage gateway used for profile avatars.
 * Optional same-origin override. Empty means the backend contract endpoint
 * /auth/profile/avatar. Absolute URLs on another origin are rejected.
 */
export const AVATAR_UPLOAD_URL =
  process.env.EXPO_PUBLIC_AVATAR_UPLOAD_URL?.trim() ?? '';
