function getApiBaseUrl(): string {
  const configuredValue = process.env.EXPO_PUBLIC_API_URL?.trim();

  // A localhost fallback is useful while developing in a simulator, but it is
  // dangerous in a shipped build: a missing EAS variable would otherwise look
  // like an ordinary "server unavailable" incident on every real device.
  if (!configuredValue && !__DEV__) {
    throw new Error(
      'Thiếu EXPO_PUBLIC_API_URL cho bản build. Hãy cấu hình URL API HTTPS trong EAS environment.',
    );
  }

  const value = configuredValue || 'http://localhost:8080/api/v1';

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
      'EXPO_PUBLIC_API_URL không hợp lệ. Ví dụ: http://192.168.1.145:8080/api/v1',
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

/**
 * Profiles approved before this instant may contain the retired dlib 128-dim
 * embedding and must be enrolled again under ArcFace 512-dim. Override this
 * value in EAS/production with the actual backend rollout instant.
 */
const DEFAULT_FACE_ID_ARCFACE_ROLLOUT_AT = '2026-07-31T01:14:52Z';
const configuredFaceIdRolloutAt =
  process.env.EXPO_PUBLIC_FACE_ID_ARCFACE_ROLLOUT_AT?.trim() ||
  DEFAULT_FACE_ID_ARCFACE_ROLLOUT_AT;

if (!Number.isFinite(Date.parse(configuredFaceIdRolloutAt))) {
  throw new Error(
    'EXPO_PUBLIC_FACE_ID_ARCFACE_ROLLOUT_AT không hợp lệ. Cần dùng ISO-8601, ví dụ 2026-07-31T01:14:52Z.',
  );
}

export const FACE_ID_ARCFACE_ROLLOUT_AT = configuredFaceIdRolloutAt;
