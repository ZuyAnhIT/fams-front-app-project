import { apiClient } from '@/services/api-client';
import * as Crypto from 'expo-crypto';

import { refreshAccessToken } from './api';
import { useAuthStore } from './store';

/** Tracks whether a token refresh is already in-flight */
let isRefreshing = false;

/** Callbacks queued while a refresh is in progress */
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

const REFRESH_EXCLUDED_PATHS = new Set([
  '/auth/login',
  '/auth/login/google',
  '/auth/login/totp',
  '/auth/register',
  '/auth/register/send-otp',
  '/auth/resend-verification',
  '/auth/verify-email',
  '/auth/otp/verify',
  '/auth/refresh-token',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

function getRequestPath(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url, apiClient.defaults.baseURL).pathname.replace(/\/api\/v\d+/, '');
  } catch {
    return url.split('?')[0];
  }
}

function shouldSkipRefresh(url: string | undefined): boolean {
  return REFRESH_EXCLUDED_PATHS.has(getRequestPath(url));
}

/** Refresh-token rotation can happen before retrying logout or switch-tenant.
 * Keep their request bodies aligned with the newly stored token. */
function syncRotatedRefreshToken(config: { url?: string; data?: unknown }): void {
  const path = getRequestPath(config.url);
  if (path !== '/auth/logout' && path !== '/auth/switch-tenant') return;
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return;

  try {
    const current =
      typeof config.data === 'string'
        ? (JSON.parse(config.data) as Record<string, unknown>)
        : ((config.data ?? {}) as Record<string, unknown>);
    const next = { ...current, refreshToken };
    config.data = typeof config.data === 'string' ? JSON.stringify(next) : next;
  } catch {
    config.data = JSON.stringify({ refreshToken });
  }
}

function flushQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token!)));
  failedQueue = [];
}

function attachSupportReference(error: unknown): void {
  if (!error || typeof error !== 'object' || !('response' in error)) return;

  const axiosLikeError = error as {
    response?: {
      status?: number;
      headers?: { get?: (name: string) => unknown; [key: string]: unknown };
      data?: unknown;
    };
    config?: { headers?: { get?: (name: string) => unknown; [key: string]: unknown } };
  };
  const status = axiosLikeError.response?.status;
  if (!status || status < 500) return;

  const responseHeaders = axiosLikeError.response?.headers;
  const requestHeaders = axiosLikeError.config?.headers;
  const responseRequestId = responseHeaders?.get?.('x-request-id') ?? responseHeaders?.['x-request-id'];
  const clientRequestId = requestHeaders?.get?.('X-Request-Id') ?? requestHeaders?.['X-Request-Id'];
  const requestId = responseRequestId ?? clientRequestId;
  if (typeof requestId !== 'string' || !requestId.trim()) return;

  const data = axiosLikeError.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  const body = data as Record<string, unknown>;
  const userMessage = typeof body.userMessage === 'string' ? body.userMessage.trim() : '';
  if (userMessage.includes('Mã hỗ trợ:')) return;

  body.userMessage = `${userMessage || 'Đã có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau.'}\nMã hỗ trợ: ${requestId}`;
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
export function setupAuthInterceptors(
  onAuthFailure: () => void | Promise<void>,
  onTenantContextChanged?: () => void | Promise<void>,
): () => void {
  // ─── Request: attach access token ─────────────────────────────────────────
  const requestInterceptorId = apiClient.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // Correlates client errors with backend audit/log entries. Backend echoes
    // this value in X-Request-Id, so support can trace the exact operation.
    if (!config.headers['X-Request-Id']) {
      config.headers['X-Request-Id'] = Crypto.randomUUID();
    }
    return config;
  });

  // ─── Response: refresh on 401 ─────────────────────────────────────────────
  const responseInterceptorId = apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Only surface a correlation ID for server failures. Validation/business
      // errors stay concise; 5xx errors gain a copyable reference for support
      // to trace through audit logs without exposing the audit viewer in App.
      attachSupportReference(error);
      const originalRequest = error.config as (typeof error.config & {
        _retry?: boolean;
      }) | undefined;

      const status = error.response?.status;

      // Refresh protected auth endpoints such as /auth/me, but never retry
      // public credential endpoints or /auth/refresh itself.
      if (
        status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        shouldSkipRefresh(originalRequest.url)
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Park request until current refresh finishes
        originalRequest._retry = true;
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          syncRotatedRefreshToken(originalRequest);
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTenantSession, setTokens } = useAuthStore.getState();

      try {
        if (!refreshToken) throw new Error('No refresh token');

        const tokens = await refreshAccessToken({ refresh_token: refreshToken });
        const previousTenantId = useAuthStore.getState().activeTenantId;
        const tenantContextChanged =
          !!tokens.active_tenant_id && tokens.active_tenant_id !== previousTenantId;

        if (tenantContextChanged) {
          await setTenantSession(
            tokens.access_token,
            tokens.refresh_token,
            tokens.active_tenant_id!,
          );
          const contextError = new Error(
            'Tenant context changed while refreshing the authenticated session',
          );
          flushQueue(contextError);
          await onTenantContextChanged?.();
          return Promise.reject(contextError);
        }

        await setTokens(tokens.access_token, tokens.refresh_token);

        flushQueue(null, tokens.access_token);
        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        syncRotatedRefreshToken(originalRequest);
        return apiClient(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError);
        await onAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return () => {
    apiClient.interceptors.request.eject(requestInterceptorId);
    apiClient.interceptors.response.eject(responseInterceptorId);
    if (failedQueue.length > 0) {
      flushQueue(new Error('Auth interceptors were disposed'));
    }
  };
}
