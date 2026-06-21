import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SendOTPRequest,
  TwoFADisableRequest,
  TwoFASetupResponse,
  TwoFAVerifyRequest,
  UserProfile,
  VerifyOTPRequest,
} from '../types';
import {
  MOCK_PASSWORD,
  MOCK_PHONE_OTP,
  MOCK_TOTP_CODE,
  MOCK_USERS,
  type MockUser,
} from './mock-data';

// ─── In-memory session state ──────────────────────────────────────────────────

const otpByPhone = new Map<string, string>();
const loginAttempts = new Map<string, number>();

const MOCK_DELAY_MS = 400;

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toProfile(user: MockUser): UserProfile {
  const { password: _pw, isLocked: _locked, ...profile } = user;
  return profile;
}

function makeTokens(userId: string): Pick<LoginResponse, 'access_token' | 'refresh_token' | 'token_type' | 'expires_in'> {
  return {
    access_token: `mock-access-${userId}-${Date.now()}`,
    refresh_token: `mock-refresh-${userId}`,
    token_type: 'Bearer',
    expires_in: 3600,
  };
}

function parseUserIdFromToken(token: string | undefined): string | null {
  if (!token?.startsWith('mock-')) return null;
  const parts = token.split('-');
  // mock-access-{userId}-{timestamp} or mock-refresh-{userId}
  if (token.startsWith('mock-access-')) {
    return parts.slice(2, -1).join('-') || null;
  }
  if (token.startsWith('mock-refresh-') || token.startsWith('mock-temp-')) {
    return parts.slice(2).join('-') || null;
  }
  return null;
}

function getAuthHeader(config: InternalAxiosRequestConfig): string | undefined {
  const auth = config.headers?.Authorization ?? config.headers?.authorization;
  return typeof auth === 'string' ? auth : undefined;
}

function findUserByEmail(email: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findUserByPhone(phone: string): MockUser | undefined {
  const normalized = phone.replace(/\D/g, '');
  return MOCK_USERS.find((u) => u.phone?.replace(/\D/g, '') === normalized);
}

function findUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

// ─── Mock response helpers ────────────────────────────────────────────────────

type MockResult =
  | { response: AxiosResponse; error?: never }
  | { error: AxiosError; response?: never };

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): MockResult {
  return {
    response: {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config,
    },
  };
}

function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  data: Record<string, unknown>,
): MockResult {
  const error = new AxiosError(
    String(data.message ?? 'Request failed'),
    String(status),
    config,
    undefined,
    {
      data,
      status,
      statusText: 'Error',
      headers: {},
      config,
    },
  );
  return { error };
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
  if (typeof config.data === 'string') {
    return JSON.parse(config.data) as T;
  }
  return config.data as T;
}

function normalizePath(url: string | undefined): string {
  if (!url) return '';
  let path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  // baseURL có thể chứa /api → /api/auth/login → /auth/login
  path = path.replace(/^\/api/, '');
  return path;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleLogin(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const body = parseBody<LoginRequest>(config);
  const user = findUserByEmail(body.email);

  if (!user || user.password !== body.password) {
    const key = body.email.toLowerCase();
    const attempts = (loginAttempts.get(key) ?? 0) + 1;
    loginAttempts.set(key, attempts);
    return fail(config, 401, {
      message: 'Email hoặc mật khẩu không đúng',
      error_code: 'INVALID_CREDENTIALS',
    });
  }

  if (user.isLocked) {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return fail(config, 423, {
      message: 'Tài khoản tạm bị khóa do đăng nhập sai nhiều lần',
      error_code: 'ACCOUNT_LOCKED',
      locked_until: lockedUntil,
    });
  }

  loginAttempts.delete(body.email.toLowerCase());

  if (user.is_2fa_enabled) {
    const data: LoginResponse = {
      ...makeTokens(user.id),
      user: toProfile(user),
      requires_2fa: true,
      temp_token: `mock-temp-${user.id}`,
    };
    return ok(config, data);
  }

  const data: LoginResponse = {
    ...makeTokens(user.id),
    user: toProfile(user),
    requires_2fa: false,
  };
  return ok(config, data);
}

async function handleSendOTP(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const body = parseBody<SendOTPRequest>(config);
  const user = findUserByPhone(body.phone);

  if (!user) {
    return fail(config, 404, { message: 'Không tìm thấy số điện thoại đã đăng ký' });
  }

  otpByPhone.set(body.phone.replace(/\D/g, ''), MOCK_PHONE_OTP);
  return ok(config, { message: `OTP đã gửi đến ${body.phone}. Mã demo: ${MOCK_PHONE_OTP}` });
}

async function handleVerifyOTP(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const body = parseBody<VerifyOTPRequest>(config);
  const normalizedPhone = body.phone.replace(/\D/g, '');
  const expectedOtp = otpByPhone.get(normalizedPhone) ?? MOCK_PHONE_OTP;
  const user = findUserByPhone(body.phone);

  if (!user) {
    return fail(config, 404, { message: 'Không tìm thấy số điện thoại' });
  }

  if (body.otp !== expectedOtp) {
    return fail(config, 400, { message: 'Mã OTP không đúng hoặc đã hết hạn' });
  }

  if (user.is_2fa_enabled) {
    const data: LoginResponse = {
      ...makeTokens(user.id),
      user: toProfile(user),
      requires_2fa: true,
      temp_token: `mock-temp-${user.id}`,
    };
    return ok(config, data);
  }

  const data: LoginResponse = {
    ...makeTokens(user.id),
    user: toProfile(user),
    requires_2fa: false,
  };
  return ok(config, data);
}

async function handleRefresh(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const body = parseBody<RefreshTokenRequest>(config);
  const userId = parseUserIdFromToken(body.refresh_token);

  if (!userId || !body.refresh_token.startsWith('mock-refresh-')) {
    return fail(config, 401, { message: 'Refresh token không hợp lệ' });
  }

  const user = findUserById(userId);
  if (!user) {
    return fail(config, 401, { message: 'Refresh token không hợp lệ' });
  }

  const data: RefreshTokenResponse = {
    ...makeTokens(user.id),
    user: toProfile(user),
  };
  return ok(config, data);
}

async function handleVerify2FA(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const body = parseBody<TwoFAVerifyRequest>(config);

  if (body.code !== MOCK_TOTP_CODE) {
    return fail(config, 400, { message: 'Mã xác thực không đúng' });
  }

  let userId = parseUserIdFromToken(body.temp_token);

  if (!userId) {
    const auth = getAuthHeader(config);
    const token = auth?.replace('Bearer ', '');
    userId = parseUserIdFromToken(token);
  }

  if (!userId) {
    return fail(config, 401, { message: 'Phiên xác thực không hợp lệ' });
  }

  const user = findUserById(userId);
  if (!user) {
    return fail(config, 404, { message: 'Không tìm thấy người dùng' });
  }

  const data: LoginResponse = {
    ...makeTokens(user.id),
    user: { ...toProfile(user), is_2fa_enabled: true },
    requires_2fa: false,
  };
  return ok(config, data);
}

async function handleSetup2FA(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const auth = getAuthHeader(config);
  const userId = parseUserIdFromToken(auth?.replace('Bearer ', ''));
  const user = userId ? findUserById(userId) : MOCK_USERS[0];

  const secret = 'JBSWY3DPEHPK3PXP';
  const otpauth = `otpauth://totp/FAMS:${user?.email ?? 'demo@fams.vn'}?secret=${secret}&issuer=FAMS`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;

  const data: TwoFASetupResponse = {
    qr_code_url: qrUrl,
    secret,
    backup_codes: ['ABCD-1234', 'EFGH-5678', 'IJKL-9012', 'MNOP-3456'],
  };
  return ok(config, data);
}

async function handleDisable2FA(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const body = parseBody<TwoFADisableRequest>(config);

  if (body.code !== MOCK_TOTP_CODE) {
    return fail(config, 400, { message: 'Mã xác thực không đúng' });
  }

  return ok(config, { message: 'Đã tắt xác thực 2 lớp' });
}

async function handleForgotPassword(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const body = parseBody<ForgotPasswordRequest>(config);
  return ok(config, {
    message: `[Mock] Link đặt lại mật khẩu đã gửi đến ${body.email}`,
  });
}

async function handleGetProfile(
  config: InternalAxiosRequestConfig,
): Promise<MockResult> {
  const auth = getAuthHeader(config);
  const userId = parseUserIdFromToken(auth?.replace('Bearer ', ''));

  if (!userId) {
    return fail(config, 401, { message: 'Unauthorized' });
  }

  const user = findUserById(userId);
  if (!user) {
    return fail(config, 401, { message: 'Unauthorized' });
  }

  return ok(config, toProfile(user));
}

async function handleLogout(config: InternalAxiosRequestConfig): Promise<MockResult> {
  return ok(config, { message: 'Đã đăng xuất' });
}

// ─── Main dispatcher ────────────────────────────────────────────────────────────

/**
 * Xử lý request auth mock. Trả về null nếu không phải route auth.
 */
export async function handleAuthMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<MockResult | null> {
  const path = normalizePath(config.url);
  const method = (config.method ?? 'get').toLowerCase();

  if (!path.startsWith('/auth')) return null;

  await delay();

  // POST /auth/login
  if (method === 'post' && path === '/auth/login') return handleLogin(config);
  if (method === 'post' && path === '/auth/otp/send') return handleSendOTP(config);
  if (method === 'post' && path === '/auth/otp/verify') return handleVerifyOTP(config);
  if (method === 'post' && path === '/auth/refresh') return handleRefresh(config);
  if (method === 'post' && path === '/auth/logout') return handleLogout(config);
  if (method === 'post' && path === '/auth/logout-all') return handleLogout(config);
  if (method === 'post' && path === '/auth/2fa/setup') return handleSetup2FA(config);
  if (method === 'post' && path === '/auth/2fa/verify') return handleVerify2FA(config);
  if (method === 'post' && path === '/auth/2fa/disable') return handleDisable2FA(config);
  if (method === 'post' && path === '/auth/forgot-password') return handleForgotPassword(config);
  if (method === 'get' && path === '/auth/me') return handleGetProfile(config);

  return fail(config, 404, { message: `[Mock] Route không hỗ trợ: ${method.toUpperCase()} ${path}` });
}
