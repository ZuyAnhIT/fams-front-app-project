import { useMutation } from '@tanstack/react-query';

import { refreshAccessToken } from '../api';
import { useAuthStore } from '../store';

/**
 * Manual token refresh hook.
 *
 * The automatic token refresh on 401 is handled transparently by the axios
 * interceptor in `api-interceptors.ts`. Use this hook only when you need to
 * explicitly refresh tokens (e.g., a "re-authenticate" flow in the settings).
 */
export function useRefreshToken() {
  const { refreshToken, setTokens, clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!refreshToken) throw new Error('No refresh token available');
      return refreshAccessToken({ refresh_token: refreshToken });
    },
    onSuccess: async (data) => {
      await setTokens(data.access_token, data.refresh_token);
    },
    onError: async () => {
      // Refresh failed – session is no longer valid
      await clearAuth();
    },
  });
}
