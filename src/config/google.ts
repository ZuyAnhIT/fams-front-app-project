/**
 * Google OAuth Web Client ID — dùng cho Sign-In trên mọi nền tảng.
 * Cùng giá trị với GOOGLE_CLIENT_ID trên backend (loại Web application).
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  '';
