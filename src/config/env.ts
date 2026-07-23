export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * Authenticated backend/object-storage gateway used for profile avatars.
 * Kept explicit so production never silently sends personal data to a public
 * third-party host. It may be a relative API path or an absolute HTTPS URL.
 */
export const AVATAR_UPLOAD_URL =
  process.env.EXPO_PUBLIC_AVATAR_UPLOAD_URL?.trim() ?? '';
