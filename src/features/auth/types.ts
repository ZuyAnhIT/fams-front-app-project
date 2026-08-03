// ─── Request Types ────────────────────────────────────────────────────────────

export interface LoginRequest {
  /** Email hoặc số điện thoại; backend yêu cầu tên field JSON là `identifier`. */
  identifier: string;
  password: string;
  device_id?: string;
}

export interface EmailRegisterRequest {
  email: string;
  password: string;
  full_name: string;
  device_id?: string;
}

export interface PhoneRegisterRequest {
  phone: string;
  password: string;
  full_name: string;
  otp_code: string;
  device_id?: string;
}

export type RegisterRequest = EmailRegisterRequest | PhoneRegisterRequest;

export interface RegisterResponse {
  user_id: string;
  email_verification_required: boolean;
  phone_verified: boolean;
  message: string;
}

export interface SendRegistrationOTPRequest {
  phone: string;
}

export interface ResendVerificationRequest {
  email: string;
}

/** Đăng nhập bằng số điện thoại — backend chỉ verify Firebase ID token đã có sẵn
 *  (xem FirebasePhoneTokenVerifier), không có bước "gửi OTP" ở phía backend —
 *  việc gửi/xác thực mã SMS do Firebase Client SDK làm trực tiếp
 *  (xem useFirebasePhoneAuth). */
export interface VerifyOTPRequest {
  firebaseIdToken: string;
  deviceId?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  /** Token extracted from the reset-password deep link */
  token: string;
  new_password: string;
}

export interface GoogleLoginRequest {
  id_token: string;
  device_id?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  date_of_birth?: string;
  hometown?: string;
  gender?: string;
  address?: string;
}

export interface RequestEmailChangeRequest {
  email: string;
}

export interface RequestPhoneChangeRequest {
  phone: string;
}

export interface ConfirmPhoneChangeRequest extends RequestPhoneChangeRequest {
  otp_code: string;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  /** Expiry in seconds */
  expires_in: number;
}

export interface LoginResponse extends TokenPair {
  user_id?: string;
  active_tenant_id?: string;
  /** Always undefined from the real backend — resolveAuthenticatedSession() falls back to GET /auth/me */
  user?: UserProfile;
  /** True when TOTP is enabled – client must complete 2FA step */
  requires_2fa: boolean;
  /**
   * Short-lived token returned only when requires_2fa is true.
   * Must be sent with the 2FA verify request.
   */
  temp_token?: string;
}

export interface RefreshTokenResponse extends TokenPair {
  user?: UserProfile;
  active_tenant_id?: string;
}

export interface SwitchTenantResponse extends TokenPair {
  user_id: string;
  active_tenant_id: string;
}

// ─── 2FA Types ────────────────────────────────────────────────────────────────

export interface TwoFASetupResponse {
  /** Short-lived token required when confirming setup via /totp/verify */
  setup_token: string;
  /** URL to the backend QR page (scan with Authenticator app) */
  qr_code_url: string;
  /** Base32 secret for manual entry into authenticator apps */
  secret: string;
}

export interface TwoFAConfirmSetupRequest {
  setup_token: string;
  code: string;
}

export interface TwoFAConfirmSetupResponse {
  /** One-time recovery codes. Backend only returns them once. */
  backup_codes: string[];
}

export interface TwoFAVerifyRequest {
  /** Provide exactly one of code or backup_code. */
  code?: string;
  backup_code?: string;
  /** Provided when completing 2FA after login */
  temp_token?: string;
}

export interface TwoFADisableRequest {
  /** Provide exactly one proof value. */
  password?: string;
  code?: string;
  backup_code?: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'employee' | 'manager' | 'admin' | 'hr';

export interface UserProfile {
  id: string;
  email?: string;
  email_verified: boolean;
  phone?: string;
  phone_verified: boolean;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  tenant_id: string;
  department?: string;
  employee_code?: string;
  is_2fa_enabled: boolean;
  /** ISO 8601 – present when account is temporarily locked */
  locked_until?: string;
  /** Issue #4 (docs/issues/ISSUES.md) — ISO 8601 date (yyyy-MM-dd) */
  date_of_birth?: string;
  hometown?: string;
  gender?: string;
  address?: string;
  /** Issue #7 (docs/issues/ISSUES.md): whether a Google account is linked for one-click login. */
  google_linked?: boolean;
  created_at?: string;
  updated_at?: string;
  active: boolean;
}

export interface AuthSession {
  id: string;
  device_id: string;
  user_agent?: string;
  ip_address?: string;
  created_at?: string;
  last_used_at?: string;
  expires_at?: string;
  current: boolean;
}

// ─── Auth Store ───────────────────────────────────────────────────────────────

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** True while tokens are being read from SecureStore on app launch */
  isHydrating: boolean;
  /** Server requires a second factor before issuing full tokens */
  is2FARequired: boolean;
  /** Short-lived token held during the 2FA verification step */
  tempToken: string | null;
  /**
   * Tenant the user is currently operating in. It must match the
   * activeTenantId embedded in the latest token pair returned by login or
   * POST /auth/switch-tenant.
   */
  activeTenantId: string | null;
}

export interface AuthActions {
  /** Persists tokens to SecureStore and updates in-memory state */
  setTokens: (access: string, refresh: string) => Promise<void>;
  /** Atomically updates the in-memory token pair and active tenant after switch. */
  setTenantSession: (access: string, refresh: string, tenantId: string) => Promise<void>;
  setUser: (user: UserProfile) => void;
  set2FARequired: (required: boolean, tempToken?: string | null) => void;
  /** Persists the chosen active tenant to SecureStore and updates in-memory state */
  setActiveTenantId: (tenantId: string | null) => Promise<void>;
  /** Called once on app start to restore a previous session */
  hydrateFromSecureStore: () => Promise<void>;
  /** Marks a restored token pair as authenticated after /auth/me succeeds. */
  finishHydration: () => void;
  /** Wipes all auth state and removes tokens from SecureStore */
  clearAuth: () => Promise<void>;
}
