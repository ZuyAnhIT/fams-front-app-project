import { apiClient } from '@/services/api-client';
import { getDeviceId } from '@/services/avatar-upload';
import { unwrapApiData } from '@/services/api-response';

import { mapLoginResponse, mapTotpSetupResponse, mapUserProfile } from '../utils/api-mappers';
import { normalizePhoneForBackend } from '../utils/auth.utils';
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
  TwoFAConfirmSetupRequest,
  TwoFASetupResponse,
  TwoFAVerifyRequest,
  UpdateProfileRequest,
  UserProfile,
  VerifyOTPRequest,
} from '../types/Auth';

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
  const payload = {
    email: body.email,
    password: body.password,
    deviceId: body.device_id ?? getDeviceId(),
  };
  const { data } = await apiClient.post(`${BASE}/login`, payload);
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
// Sending/confirming the SMS code happens entirely against Firebase, client-side
// (see useFirebasePhoneAuth) — the backend never sees a phone number or a code,
// only the resulting Firebase ID token.

export async function verifyPhoneOTP(body: VerifyOTPRequest): Promise<LoginResponse> {
  const payload = {
    firebaseIdToken: body.firebaseIdToken,
    deviceId: body.deviceId ?? getDeviceId(),
  };
  const { data } = await apiClient.post(`${BASE}/otp/verify`, payload);
  return mapLoginResponse(unwrapApiData(data));
}

// ─── Token Management ─────────────────────────────────────────────────────────

export async function refreshAccessToken(
  body: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post(`${BASE}/refresh`, body);
  const raw = unwrapApiData<{
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: number;
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  }>(data);

  const accessToken = raw.accessToken ?? raw.access_token;
  const refreshToken = raw.refreshToken ?? raw.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new Error('Refresh response does not contain a valid token pair');
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: raw.expiresIn ?? raw.expires_in ?? 0,
  };
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
  // Issue #4 (docs/issues/ISSUES.md)
  if (body.date_of_birth !== undefined) payload.dateOfBirth = body.date_of_birth;
  if (body.hometown !== undefined) payload.hometown = body.hometown;
  if (body.gender !== undefined) payload.gender = body.gender;
  if (body.address !== undefined) payload.address = body.address;

  const { data } = await apiClient.patch(`${BASE}/me`, payload);
  return mapUserProfile(unwrapApiData(data), existing ?? undefined);
}
