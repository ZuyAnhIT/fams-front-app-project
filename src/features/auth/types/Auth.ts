// ─── Request Types ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  device_id?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
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
  phone?: string;
  avatar_url?: string;
  department?: string;
  /** Issue #4 (docs/issues/ISSUES.md) */
  date_of_birth?: string;
  hometown?: string;
  gender?: string;
  address?: string;
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

export interface TwoFAVerifyRequest {
  /** 6-digit TOTP code from authenticator app */
  code: string;
  /** Provided when completing 2FA after login */
  temp_token?: string;
}

/** Backend disables TOTP without a code — kept for optional UI confirmation step */
export interface TwoFADisableRequest {
  code?: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'employee' | 'manager' | 'admin' | 'hr';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
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
   * Tenant the user is currently operating in. Backend has no single
   * "current tenant" concept (users can hold roles in multiple tenants via
   * `user_roles`), so this is chosen client-side after login and persisted
   * across app restarts independently of `user`.
   */
  activeTenantId: string | null;
}

export interface AuthActions {
  /** Persists tokens to SecureStore and updates in-memory state */
  setTokens: (access: string, refresh: string) => Promise<void>;
  setUser: (user: UserProfile) => void;
  set2FARequired: (required: boolean, tempToken?: string | null) => void;
  /** Persists the chosen active tenant to SecureStore and updates in-memory state */
  setActiveTenantId: (tenantId: string | null) => Promise<void>;
  /** Called once on app start to restore a previous session */
  hydrateFromSecureStore: () => Promise<void>;
  /** Wipes all auth state and removes tokens from SecureStore */
  clearAuth: () => Promise<void>;
}
