// ─── Request Types ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SendOTPRequest {
  phone: string;
}

export interface VerifyOTPRequest {
  phone: string;
  /** 6-digit OTP sent via SMS */
  otp: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
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
  user: UserProfile;
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
  /** URL to render as QR code (otpauth://…) */
  qr_code_url: string;
  /** Raw secret for manual entry into authenticator apps */
  secret: string;
  /** One-time backup codes */
  backup_codes: string[];
}

export interface TwoFAVerifyRequest {
  /** 6-digit TOTP code from authenticator app */
  code: string;
  /** Provided when completing 2FA after login */
  temp_token?: string;
}

export interface TwoFADisableRequest {
  /** Must provide current TOTP code to confirm intent */
  code: string;
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
}

export interface AuthActions {
  /** Persists tokens to SecureStore and updates in-memory state */
  setTokens: (access: string, refresh: string) => Promise<void>;
  setUser: (user: UserProfile) => void;
  set2FARequired: (required: boolean, tempToken?: string | null) => void;
  /** Called once on app start to restore a previous session */
  hydrateFromSecureStore: () => Promise<void>;
  /** Wipes all auth state and removes tokens from SecureStore */
  clearAuth: () => Promise<void>;
}
