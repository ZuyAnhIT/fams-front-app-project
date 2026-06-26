import { type AxiosAdapter } from 'axios';

import { USE_MOCK_API } from '@/config/env';
import { handleTenantMockRequest } from '@/features/tenant/mock/tenant.mock-handler';
import { apiClient } from '@/services/api-client';

import { handleAuthMockRequest } from './auth.mock-handler';

let installed = false;

/**
 * Gắn axios adapter mock cho toàn bộ API FAMS.
 * Chỉ chạy khi EXPO_PUBLIC_USE_MOCK_API=true.
 *
 * Thứ tự ưu tiên: auth → tenant → (future features)
 */
export function setupMockApi(): void {
  if (!USE_MOCK_API || installed) return;

  const originalAdapter = apiClient.defaults.adapter as AxiosAdapter | undefined;

  apiClient.defaults.adapter = async (config) => {
    // Try each feature mock handler in priority order
    const handlers = [
      handleAuthMockRequest,
      handleTenantMockRequest,
    ];

    for (const handler of handlers) {
      const result = await handler(config);
      if (result) {
        if (result.error) throw result.error;
        return result.response;
      }
    }

    if (originalAdapter) {
      return originalAdapter(config);
    }

    throw new Error(
      `[Mock] Route chưa mock: ${config.method?.toUpperCase()} ${config.url}`,
    );
  };

  installed = true;
  console.info(
    '[FAMS Mock API] auth: demo@fams.vn/123456 | tenant: /tenants, /tenants/me, /plans',
  );
}
