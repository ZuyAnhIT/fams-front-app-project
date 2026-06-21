import axios, { type AxiosAdapter } from 'axios';

import { USE_MOCK_API } from '@/config/env';
import { apiClient } from '@/services/api-client';

import { handleAuthMockRequest } from './auth.mock-handler';

let installed = false;

/**
 * Gắn axios adapter mock cho các route /auth/*.
 * Chỉ chạy khi EXPO_PUBLIC_USE_MOCK_API=true.
 */
export function setupMockApi(): void {
  if (!USE_MOCK_API || installed) return;

  const originalAdapter = apiClient.defaults.adapter as AxiosAdapter | undefined;

  apiClient.defaults.adapter = async (config) => {
    const mockResult = await handleAuthMockRequest(config);

    if (mockResult) {
      if (mockResult.error) throw mockResult.error;
      return mockResult.response;
    }

    if (originalAdapter) {
      return originalAdapter(config);
    }

    // Chưa có backend – chỉ mock auth được hỗ trợ
    throw new Error(
      `[Mock] Route chưa mock: ${config.method?.toUpperCase()} ${config.url}`,
    );
  };

  installed = true;
  console.info(
    '[FAMS Mock API] demo@fams.vn / 123456 | 2fa@fams.vn → OTP 654321 | SĐT 0912345678 → OTP 123456',
  );
}
