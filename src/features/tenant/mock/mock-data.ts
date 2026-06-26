import type { Tenant } from '../types';

/** Tenant seed data used by mock handler */
export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'tenant-fams-01',
    name: 'FAMS Demo Company',
    slug: 'fams-demo',
    logo_url: undefined,
    industry: 'manufacturing',
    status: 'active',
    employee_count: 45,
    created_at: '2024-01-15T07:00:00.000Z',
    updated_at: '2025-06-01T10:00:00.000Z',
    subscription: {
      plan: 'professional',
      starts_at: '2024-01-15T00:00:00.000Z',
      ends_at: '2025-12-31T23:59:59.000Z',
      employee_limit: 200,
      storage_limit_gb: 50,
      api_call_limit: -1,
      is_active: true,
    },
    settings: {
      language: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      brand_color: '#2563EB',
      notifications_enabled: true,
      late_checkin_alert: true,
      checkin_early_minutes: 30,
      geofence_radius_meters: 200,
      require_face_id: false,
      random_check_enabled: true,
    },
  },
  {
    id: 'tenant-startup-02',
    name: 'Startup Việt',
    slug: 'startup-viet',
    industry: 'retail',
    status: 'trial',
    employee_count: 8,
    created_at: '2025-03-10T08:00:00.000Z',
    updated_at: '2025-06-10T09:00:00.000Z',
    subscription: {
      plan: 'starter',
      starts_at: '2025-03-10T00:00:00.000Z',
      ends_at: '2025-07-10T23:59:59.000Z',
      employee_limit: 50,
      storage_limit_gb: 10,
      api_call_limit: 10_000,
      is_active: true,
    },
    settings: {
      language: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      brand_color: '#7C3AED',
      notifications_enabled: true,
      late_checkin_alert: false,
      checkin_early_minutes: 15,
      geofence_radius_meters: 100,
      require_face_id: false,
      random_check_enabled: false,
    },
  },
];

/** Gợi ý tài khoản admin platform trong mock */
export const MOCK_TENANT_HINT = [
  { label: 'Admin đăng nhập', value: 'demo@fams.vn / 123456 (role: admin để thấy list)' },
  { label: 'Tenant active', value: 'tenant-fams-01 – FAMS Demo Company' },
];
