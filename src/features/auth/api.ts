import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import { mapLoginResponse, mapTotpSetupResponse, mapUserProfile } from './api-mappers';
import { normalizePhoneForBackend } from './utils';
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  ResetPasswordRequest,
  SendOTPRequest,
  TwoFAConfirmSetupRequest,
  TwoFASetupResponse,
  TwoFAVerifyRequest,
  UpdateProfileRequest,
  UserProfile,
  VerifyOTPRequest,
} from './types';

const BASE = '/auth';

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(body: RegisterRequest): Promise<LoginResponse> {
  const payload = {
    email: body.email,
    password: body.password,
    displayName: body.full_name,
    ...(body.phone ? { phone: normalizePhoneForBackend(body.phone) } : {}),
  };
  const { data } = await apiClient.post(`${BASE}/register`, payload);
  return mapLoginResponse(unwrapApiData(data));
}

// ─── Email / Password Login ───────────────────────────────────────────────────

export async function loginWithEmail(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post(`${BASE}/login`, body);
  return mapLoginResponse(unwrapApiData(data));
}

// ─── Google Login ─────────────────────────────────────────────────────────────

export async function loginWithGoogle(body: GoogleLoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post(`${BASE}/login/google`, {
    idToken: body.id_token,
    deviceId: body.device_id ?? 'mobile',
  });
  return mapLoginResponse(unwrapApiData(data));
}

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export async function sendPhoneOTP(body: SendOTPRequest): Promise<{ message: string }> {
  const payload = { phone: normalizePhoneForBackend(body.phone) };
  const { data } = await apiClient.post(`${BASE}/otp/send`, payload);
  const envelope = data as { message?: string };
  return { message: envelope.message ?? 'OTP sent' };
}

export async function verifyPhoneOTP(body: VerifyOTPRequest): Promise<LoginResponse> {
  const payload = {
    phone: normalizePhoneForBackend(body.phone),
    code: body.otp,
  };
  const { data } = await apiClient.post(`${BASE}/otp/verify`, payload);
  return mapLoginResponse(unwrapApiData(data));
}

// ─── Token Management ─────────────────────────────────────────────────────────

export async function refreshAccessToken(
  body: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post<RefreshTokenResponse>(`${BASE}/refresh`, body);
  return unwrapApiData(data);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutSingleDevice(): Promise<void> {
  await apiClient.post(`${BASE}/logout`);
}

export async function logoutAllDevices(): Promise<void> {
  await apiClient.post(`${BASE}/logout/all`);
}

// ─── 2FA (TOTP) ───────────────────────────────────────────────────────────────

export async function setup2FA(): Promise<TwoFASetupResponse> {
  const { data } = await apiClient.post(`${BASE}/totp/setup`);
  return mapTotpSetupResponse(unwrapApiData(data));
}

/** Completes login when TOTP is required after password auth */
export async function verifyLoginTotp(body: TwoFAVerifyRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post(`${BASE}/login/totp`, {
    pendingToken: body.temp_token,
    code: body.code,
  });
  return mapLoginResponse(unwrapApiData(data));
}

/** Confirms TOTP setup after scanning QR (requires setup_token from setup2FA) */
export async function confirmTotpSetup(body: TwoFAConfirmSetupRequest): Promise<void> {
  await apiClient.post(`${BASE}/totp/verify`, {
    setupToken: body.setup_token,
    code: body.code,
  });
}

export async function disable2FA(): Promise<{ message: string }> {
  await apiClient.post(`${BASE}/totp/disable`);
  return { message: 'Đã tắt xác thực 2 lớp' };
}

// ─── Password ─────────────────────────────────────────────────────────────────

export async function forgotPassword(
  body: ForgotPasswordRequest,
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`${BASE}/forgot-password`, body);
  const envelope = data as { message?: string };
  return { message: envelope.message ?? 'Yêu cầu đã được gửi' };
}

export async function resetPassword(
  body: ResetPasswordRequest,
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`${BASE}/reset-password`, body);
  const envelope = data as { message?: string };
  return { message: envelope.message ?? 'Đặt lại mật khẩu thành công' };
}

export async function changePassword(
  body: ChangePasswordRequest,
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`${BASE}/change-password`, {
    currentPassword: body.current_password,
    newPassword: body.new_password,
  });
  const envelope = data as { message?: string };
  return { message: envelope.message ?? 'Đổi mật khẩu thành công' };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getMyProfile(existing?: UserProfile | null): Promise<UserProfile> {
  const { data } = await apiClient.get(`${BASE}/me`);
  return mapUserProfile(unwrapApiData(data), existing ?? undefined);
}

export async function updateMyProfile(
  body: UpdateProfileRequest,
  existing?: UserProfile | null,
): Promise<UserProfile> {
  const payload: Record<string, string> = {};
  if (body.full_name !== undefined) payload.displayName = body.full_name;
  if (body.phone !== undefined) {
    payload.phone = body.phone ? normalizePhoneForBackend(body.phone) : '';
  }
  if (body.avatar_url !== undefined) payload.avatarUrl = body.avatar_url;

  const { data } = await apiClient.patch(`${BASE}/me`, payload);
  return mapUserProfile(unwrapApiData(data), existing ?? undefined);
}
