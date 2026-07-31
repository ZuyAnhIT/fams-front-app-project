import { apiClient } from '@/services/api-client';
import { getDeviceId } from '@/services/avatar-upload';
import { unwrapApiData } from '@/services/api-response';

import {
  mapLoginResponse,
  mapRegisterResponse,
  mapTotpEnableResponse,
  mapTotpSetupResponse,
  mapUserProfile,
} from './api-mappers';
import { normalizePhoneForBackend } from './utils';
import type {
  AuthSession,
  ChangePasswordRequest,
  ConfirmPhoneChangeRequest,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  RequestEmailChangeRequest,
  RequestPhoneChangeRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SendRegistrationOTPRequest,
  SwitchTenantResponse,
  TwoFAConfirmSetupRequest,
  TwoFAConfirmSetupResponse,
  TwoFADisableRequest,
  TwoFASetupResponse,
  TwoFAVerifyRequest,
  UpdateProfileRequest,
  UserProfile,
  VerifyOTPRequest,
} from './types';

const BASE = '/auth';

// ─── Register ─────────────────────────────────────────────────────────────────

export async function sendRegistrationOTP(
  body: SendRegistrationOTPRequest,
): Promise<void> {
  await apiClient.post(`${BASE}/register/send-otp`, {
    phone: normalizePhoneForBackend(body.phone),
  });
}

export async function registerUser(body: RegisterRequest): Promise<RegisterResponse> {
  const deviceId = body.device_id ?? (await getDeviceId());
  const common = {
    password: body.password,
    displayName: body.full_name,
    deviceId,
  };
  const payload = 'email' in body
    ? { ...common, email: body.email.trim().toLowerCase() }
    : {
        ...common,
        phone: normalizePhoneForBackend(body.phone),
        otpCode: body.otp_code,
      };
  const { data } = await apiClient.post(`${BASE}/register`, payload);
  return mapRegisterResponse(unwrapApiData(data));
}

export async function resendVerificationEmail(
  body: ResendVerificationRequest,
): Promise<void> {
  await apiClient.post(`${BASE}/resend-verification`, {
    email: body.email.trim().toLowerCase(),
  });
}

export async function verifyEmailToken(token: string): Promise<void> {
  await apiClient.get(`${BASE}/verify-email`, {
    params: { token },
  });
}

// ─── Email / Phone + Password Login ──────────────────────────────────────────

export async function loginWithPassword(body: LoginRequest): Promise<LoginResponse> {
  const rawIdentifier = body.identifier.trim();
  const identifier = rawIdentifier.includes('@')
    ? rawIdentifier.toLowerCase()
    : normalizePhoneForBackend(rawIdentifier);
  const payload = {
    identifier,
    password: body.password,
    deviceId: body.device_id ?? (await getDeviceId()),
  };
  const { data } = await apiClient.post(`${BASE}/login`, payload);
  return mapLoginResponse(unwrapApiData(data));
}

// ─── Google Login ─────────────────────────────────────────────────────────────

export async function loginWithGoogle(body: GoogleLoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post(`${BASE}/login/google`, {
    idToken: body.id_token,
    deviceId: body.device_id ?? (await getDeviceId()),
  });
  return mapLoginResponse(unwrapApiData(data));
}

export async function linkGoogleAccount(idToken: string): Promise<void> {
  await apiClient.post(`${BASE}/link-google`, { idToken });
}

export async function unlinkGoogleAccount(): Promise<void> {
  await apiClient.post(`${BASE}/unlink-google`);
}

// ─── Phone OTP ────────────────────────────────────────────────────────────────
// Sending/confirming the SMS code happens entirely against Firebase, client-side
// (see useFirebasePhoneAuth) — the backend never sees a phone number or a code,
// only the resulting Firebase ID token.

export async function verifyPhoneOTP(body: VerifyOTPRequest): Promise<LoginResponse> {
  const payload = {
    firebaseIdToken: body.firebaseIdToken,
    deviceId: body.deviceId ?? (await getDeviceId()),
  };
  const { data } = await apiClient.post(`${BASE}/otp/verify`, payload);
  return mapLoginResponse(unwrapApiData(data));
}

// ─── Token Management ─────────────────────────────────────────────────────────

export async function refreshAccessToken(
  body: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post(`${BASE}/refresh-token`, {
    refreshToken: body.refresh_token,
  });
  const raw = unwrapApiData<{
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: number;
    activeTenantId?: string;
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
    active_tenant_id: raw.activeTenantId,
  };
}

/**
 * Switches the tenant embedded in the authenticated session. The request
 * interceptor supplies the current access token; the current refresh token is
 * also required in the body so the backend can rotate both tokens together.
 */
export async function switchActiveTenant(
  tenantId: string,
  refreshToken: string,
): Promise<SwitchTenantResponse> {
  const { data } = await apiClient.post(`${BASE}/switch-tenant`, {
    tenantId,
    refreshToken,
  });
  const raw = unwrapApiData<{
    userId?: string;
    activeTenantId?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: number;
  }>(data);

  if (!raw.accessToken || !raw.refreshToken || !raw.activeTenantId) {
    throw new Error('Switch-tenant response does not contain a valid session');
  }

  return {
    user_id: raw.userId ?? '',
    active_tenant_id: raw.activeTenantId,
    access_token: raw.accessToken,
    refresh_token: raw.refreshToken,
    token_type: 'Bearer',
    expires_in: raw.expiresIn ?? 0,
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutSingleDevice(refreshToken: string): Promise<void> {
  await apiClient.post(`${BASE}/logout`, { refreshToken });
}

export async function logoutAllDevices(): Promise<void> {
  await apiClient.post(`${BASE}/logout/all`);
}

export async function logoutOtherDevices(): Promise<void> {
  await apiClient.post(`${BASE}/logout/others`);
}

export async function getAuthSessions(): Promise<AuthSession[]> {
  const { data } = await apiClient.get(`${BASE}/sessions`);
  const raw = unwrapApiData<{
    id?: string;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt?: string;
    lastUsedAt?: string;
    expiresAt?: string;
    current?: boolean;
  }[]>(data);
  return (Array.isArray(raw) ? raw : []).map((session) => ({
    id: session.id ?? '',
    device_id: session.deviceId ?? 'unknown',
    user_agent: session.userAgent,
    ip_address: session.ipAddress,
    created_at: session.createdAt,
    last_used_at: session.lastUsedAt,
    expires_at: session.expiresAt,
    current: session.current ?? false,
  }));
}

export async function revokeAuthSession(sessionId: string): Promise<void> {
  await apiClient.delete(`${BASE}/sessions/${encodeURIComponent(sessionId)}`);
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
    ...(body.code ? { code: body.code } : {}),
    ...(body.backup_code ? { backupCode: body.backup_code } : {}),
  });
  return mapLoginResponse(unwrapApiData(data));
}

/** Confirms setup and returns one-time backup codes. */
export async function confirmTotpSetup(
  body: TwoFAConfirmSetupRequest,
): Promise<TwoFAConfirmSetupResponse> {
  const { data } = await apiClient.post(`${BASE}/totp/verify`, {
    setupToken: body.setup_token,
    code: body.code,
  });
  return mapTotpEnableResponse(unwrapApiData(data));
}

export async function disable2FA(
  body: TwoFADisableRequest,
): Promise<{ message: string }> {
  await apiClient.post(`${BASE}/totp/disable`, {
    ...(body.password ? { password: body.password } : {}),
    ...(body.code ? { code: body.code } : {}),
    ...(body.backup_code ? { backupCode: body.backup_code } : {}),
  });
  return { message: 'Đã tắt xác thực 2 lớp' };
}

// ─── Password ─────────────────────────────────────────────────────────────────

export async function forgotPassword(
  body: ForgotPasswordRequest,
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`${BASE}/forgot-password`, {
    email: body.email.trim().toLowerCase(),
  });
  const envelope = data as { message?: string };
  return { message: envelope.message ?? 'Yêu cầu đã được gửi' };
}

export async function resetPassword(
  body: ResetPasswordRequest,
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`${BASE}/reset-password`, {
    token: body.token,
    newPassword: body.new_password,
  });
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
  if (body.date_of_birth !== undefined) payload.dateOfBirth = body.date_of_birth;
  if (body.hometown !== undefined) payload.hometown = body.hometown;
  if (body.gender !== undefined) payload.gender = body.gender;
  if (body.address !== undefined) payload.address = body.address;

  const { data } = await apiClient.patch(`${BASE}/me`, payload);
  return mapUserProfile(unwrapApiData(data), existing ?? undefined);
}

export async function requestEmailChange(
  body: RequestEmailChangeRequest,
): Promise<void> {
  await apiClient.post(`${BASE}/profile/email/request-change`, {
    email: body.email.trim().toLowerCase(),
  });
}

export async function confirmEmailChange(token: string): Promise<void> {
  await apiClient.get(`${BASE}/profile/email/confirm-change`, {
    params: { token },
  });
}

export async function requestPhoneChange(
  body: RequestPhoneChangeRequest,
): Promise<void> {
  await apiClient.post(`${BASE}/profile/phone/request-change`, {
    phone: normalizePhoneForBackend(body.phone),
  });
}

export async function confirmPhoneChange(
  body: ConfirmPhoneChangeRequest,
  existing?: UserProfile | null,
): Promise<UserProfile> {
  const { data } = await apiClient.post(`${BASE}/profile/phone/confirm-change`, {
    phone: normalizePhoneForBackend(body.phone),
    otpCode: body.otp_code,
  });
  return mapUserProfile(unwrapApiData(data), existing ?? undefined);
}
