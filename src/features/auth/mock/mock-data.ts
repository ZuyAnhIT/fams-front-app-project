import type { UserProfile } from '../types';

/** Mật khẩu dùng chung cho tất cả tài khoản mock */
export const MOCK_PASSWORD = '123456';

/** OTP cố định cho đăng nhập số điện thoại */
export const MOCK_PHONE_OTP = '123456';

/** Mã TOTP cố định cho tài khoản bật 2FA */
export const MOCK_TOTP_CODE = '654321';

export interface MockUser extends UserProfile {
  password: string;
  /** Tài khoản bị khóa tạm (brute force) */
  isLocked?: boolean;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'user-demo-001',
    email: 'demo@fams.vn',
    password: MOCK_PASSWORD,
    phone: '0912345678',
    full_name: 'Nguyễn Văn Demo',
    role: 'employee',
    tenant_id: 'tenant-fams-01',
    department: 'Sản xuất',
    employee_code: 'NV001',
    is_2fa_enabled: false,
  },
  {
    id: 'user-2fa-002',
    email: '2fa@fams.vn',
    password: MOCK_PASSWORD,
    phone: '0987654321',
    full_name: 'Trần Thị 2FA',
    role: 'manager',
    tenant_id: 'tenant-fams-01',
    department: 'Nhân sự',
    employee_code: 'NV002',
    is_2fa_enabled: true,
  },
  {
    id: 'user-locked-003',
    email: 'locked@fams.vn',
    password: MOCK_PASSWORD,
    phone: '0900000000',
    full_name: 'Tài khoản bị khóa',
    role: 'employee',
    tenant_id: 'tenant-fams-01',
    employee_code: 'NV003',
    is_2fa_enabled: false,
    isLocked: true,
  },
];

/** Gợi ý hiển thị trên màn hình dev */
export const MOCK_CREDENTIALS_HINT = [
  { label: 'Đăng nhập thường', value: 'demo@fams.vn / 123456' },
  { label: 'Có 2FA', value: '2fa@fams.vn / 123456 → OTP: 654321' },
  { label: 'Tài khoản khóa', value: 'locked@fams.vn / 123456' },
  { label: 'SĐT + OTP', value: '0912345678 → OTP: 123456' },
];
