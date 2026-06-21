import { apiClient } from '@/services/api-client';

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
} from './types';

const BASE = '/auth';

// ─── Email / Password Login ───────────────────────────────────────────────────

export async function loginWithEmail(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(`${BASE}/login`, body);
  return data;
}

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export async function sendPhoneOTP(body: SendOTPRequest): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(`${BASE}/otp/send`, body);
  return data;
}

export async function verifyPhoneOTP(body: VerifyOTPRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(`${BASE}/otp/verify`, body);
  return data;
}

// ─── Token Management ─────────────────────────────────────────────────────────

export async function refreshAccessToken(
  body: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post<RefreshTokenResponse>(`${BASE}/refresh`, body);
  return data;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/** Invalidates only the current device's refresh token */
export async function logoutSingleDevice(): Promise<void> {
  await apiClient.post(`${BASE}/logout`);
}

/** Invalidates all refresh tokens issued to this user */
export async function logoutAllDevices(): Promise<void> {
  await apiClient.post(`${BASE}/logout-all`);
}

// ─── 2FA (TOTP) ───────────────────────────────────────────────────────────────

/** Generates a new TOTP secret + QR code URL for the authenticated user */
export async function setup2FA(): Promise<TwoFASetupResponse> {
  const { data } = await apiClient.post<TwoFASetupResponse>(`${BASE}/2fa/setup`);
  return data;
}

/**
 * Verifies a TOTP code.
 * - During login (requires_2fa flow): supply temp_token in the body.
 * - During setup confirmation: temp_token is omitted.
 */
export async function verify2FA(body: TwoFAVerifyRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(`${BASE}/2fa/verify`, body);
  return data;
}

/** Disables 2FA after confirming with a valid TOTP code */
export async function disable2FA(
  body: TwoFADisableRequest,
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(`${BASE}/2fa/disable`, body);
  return data;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export async function forgotPassword(
  body: ForgotPasswordRequest,
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    `${BASE}/forgot-password`,
    body,
  );
  return data;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>(`${BASE}/me`);
  return data;
}
