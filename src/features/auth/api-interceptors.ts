import { apiClient } from '@/services/api-client';

import { refreshAccessToken } from './api';
import { useAuthStore } from './store';

/** Tracks whether a token refresh is already in-flight */
let isRefreshing = false;

/** Callbacks queued while a refresh is in progress */
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token!)));
  failedQueue = [];
}

/**
 * Attaches auth interceptors to apiClient. Call this once on app start.
 *
 * Request interceptor  – injects `Authorization: Bearer <token>` header.
 * Response interceptor – transparently refreshes the access token on 401
 *                        and retries the original request. All concurrent
 *                        requests that 401 while a refresh is in-flight are
 *                        queued and replayed once the refresh completes.
 *
 * @param onAuthFailure – called when the refresh token itself is invalid
 *                        (e.g. expired or revoked); should navigate to login.
 */
export function setupAuthInterceptors(onAuthFailure: () => void): void {
  // ─── Request: attach access token ─────────────────────────────────────────
  apiClient.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  // ─── Response: refresh on 401 ─────────────────────────────────────────────
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as typeof error.config & {
        _retry?: boolean;
      };

      const status = error.response?.status;

      // Only handle 401; skip auth endpoints to avoid infinite loops
      const isAuthEndpoint = (originalRequest.url as string | undefined)?.includes(
        '/auth/',
      );
      if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Park request until current refresh finishes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();

      try {
        if (!refreshToken) throw new Error('No refresh token');

        const tokens = await refreshAccessToken({ refresh_token: refreshToken });
        await setTokens(tokens.access_token, tokens.refresh_token);

        flushQueue(null, tokens.access_token);
        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError);
        await clearAuth();
        onAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}
