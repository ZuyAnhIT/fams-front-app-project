import type { FaceStatusResponse, TenantInvitation } from '../types/Profile';
import { FACE_CONSENT_VERSION } from '../utils/face-quality';

/** Trạng thái Face ID mặc định khi chưa đăng ký */
export const DEFAULT_FACE_STATUS: FaceStatusResponse = {
  status: 'not_registered',
  consent_given: false,
  photo_count: 0,
};

export const MOCK_PENDING_INVITATIONS: TenantInvitation[] = [
  {
    id: 'inv-001',
    tenant_id: 'tenant-acme',
    tenant_name: 'Công ty TNHH ACME Việt Nam',
    invited_by_name: 'Nguyễn Văn Quản Lý',
    role: 'employee',
    message: 'Mời bạn tham gia hệ thống chấm công FAMS của công ty.',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export { FACE_CONSENT_VERSION };
