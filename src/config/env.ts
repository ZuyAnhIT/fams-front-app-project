/** Bật mock API khi chưa có backend – set EXPO_PUBLIC_USE_MOCK_API=true */
export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
