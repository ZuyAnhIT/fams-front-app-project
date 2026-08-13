import type {
  LoginResponse,
  RegisterResponse,
  TwoFASetupResponse,
  TwoFAConfirmSetupResponse,
  UserProfile,
  UserRole,
} from './types';

/** Backend login payload (camelCase keys from Spring Boot). */
interface BackendLoginResponse {
  userId?: string;
  activeTenantId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  totpRequired?: boolean;
  pendingToken?: string;
}

interface BackendRegisterResponse {
  userId?: string | number;
  emailVerificationRequired?: boolean;
  phoneVerified?: boolean;
  message?: string;
}

/** Backend `/auth/me` and `/auth/register` user payload. */
interface BackendUserProfile {
  id: string | number;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  /** Display name returned by Spring Boot backend */
  displayName?: string;
  /** Some backends return full_name directly */
  full_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  /** Backend role field (camelCase or snake_case) */
  role?: string;
  userRole?: string;
  tenantId?: string;
  tenant_id?: string;
  department?: string;
  employeeCode?: string;
  employee_code?: string;
  /** Whether TOTP is currently enabled */
  totpEnabled?: boolean;
  is_2fa_enabled?: boolean;
  /** ISO 8601 – present when account is temporarily locked */
  lockedUntil?: string;
  locked_until?: string;
  /** Issue #4 (docs/issues/ISSUES.md) */
  dateOfBirth?: string;
  date_of_birth?: string;
  hometown?: string;
  gender?: string;
  address?: string;
  /** Issue #7 (docs/issues/ISSUES.md) */
  googleLinked?: boolean;
  google_linked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
}

interface BackendTotpSetupResponse {
  setupToken?: string;
  otpauthUri?: string;
  qrCodeUrl?: string;
  manualEntryKey?: string;
  expiresAt?: string;
}

interface BackendTotpEnableResponse {
  backupCodes?: string[];
}

const VALID_ROLES: UserRole[] = ['employee', 'manager', 'admin', 'hr'];

function toUserRole(raw?: string): UserRole {
  const normalised = raw?.toLowerCase() as UserRole | undefined;
  return normalised && VALID_ROLES.includes(normalised) ? normalised : 'employee';
}

export function mapLoginResponse(raw: BackendLoginResponse): LoginResponse {
  return {
    user_id: raw.userId,
    active_tenant_id: raw.activeTenantId,
    access_token: raw.accessToken ?? '',
    refresh_token: raw.refreshToken ?? '',
    token_type: 'Bearer',
    expires_in: raw.expiresIn ?? 0,
    requires_2fa: raw.totpRequired ?? false,
    temp_token: raw.pendingToken,
  };
}

export function mapRegisterResponse(raw: BackendRegisterResponse): RegisterResponse {
  return {
    user_id: String(raw.userId ?? ''),
    email_verification_required: raw.emailVerificationRequired ?? false,
    phone_verified: raw.phoneVerified ?? false,
    message: raw.message ?? 'Đăng ký thành công',
  };
}

export function mapUserProfile(
  raw: BackendUserProfile,
  existing?: Pick<
    UserProfile,
    'is_2fa_enabled' | 'role' | 'tenant_id' | 'department' | 'employee_code'
  >,
): UserProfile {
  return {
    id: String(raw.id),
    email: raw.email || undefined,
    email_verified: raw.emailVerified ?? false,
    phone: raw.phone,
    phone_verified: raw.phoneVerified ?? false,
    full_name: raw.displayName ?? raw.full_name ?? '',
    avatar_url: raw.avatarUrl ?? raw.avatar_url,
    role:
      raw.role || raw.userRole
        ? toUserRole(raw.role ?? raw.userRole)
        : (existing?.role ?? 'employee'),
    tenant_id: raw.tenantId ?? raw.tenant_id ?? existing?.tenant_id ?? '',
    department: raw.department ?? existing?.department,
    employee_code: raw.employeeCode ?? raw.employee_code ?? existing?.employee_code,
    is_2fa_enabled: raw.totpEnabled ?? raw.is_2fa_enabled ?? existing?.is_2fa_enabled ?? false,
    locked_until: raw.lockedUntil ?? raw.locked_until,
    date_of_birth: raw.dateOfBirth ?? raw.date_of_birth,
    hometown: raw.hometown,
    gender: raw.gender,
    address: raw.address,
    google_linked: raw.googleLinked ?? raw.google_linked ?? false,
    created_at: raw.createdAt,
    updated_at: raw.updatedAt,
    active: raw.active ?? true,
  };
}

export function mapTotpSetupResponse(raw: BackendTotpSetupResponse): TwoFASetupResponse {
  if (!raw.setupToken || !raw.otpauthUri || !raw.manualEntryKey || !raw.expiresAt) {
    throw new Error('Phản hồi khởi tạo 2FA từ máy chủ không đầy đủ. Vui lòng thử lại.');
  }

  return {
    setup_token: raw.setupToken,
    otpauth_uri: raw.otpauthUri,
    secret: raw.manualEntryKey,
    expires_at: raw.expiresAt,
    qr_code_url: raw.qrCodeUrl,
  };
}

export function mapTotpEnableResponse(
  raw: BackendTotpEnableResponse,
): TwoFAConfirmSetupResponse {
  return { backup_codes: raw.backupCodes ?? [] };
}
