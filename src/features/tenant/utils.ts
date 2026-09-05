import { isAxiosError } from 'axios';

import type { PlanDetail, SubscriptionPlan, TenantIndustry, AppLanguage, AppTimezone } from './types';

// ─── Error Parsing ────────────────────────────────────────────────────────────

/** Parses API errors into Vietnamese user-facing messages */
export function parseTenantError(error: unknown): string {
  if (!isAxiosError(error)) return 'Đã có lỗi xảy ra. Vui lòng thử lại';

  const data = error.response?.data as Record<string, unknown> | undefined;

  if (typeof data?.message === 'string') return data.message;

  const status = error.response?.status;
  if (!error.response) return 'Không thể kết nối đến máy chủ';

  switch (status) {
    case 400: return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại';
    case 403: return 'Bạn không có quyền thực hiện thao tác này';
    case 404: return 'Không tìm thấy công ty';
    case 409: return 'Tên miền (slug) này đã được sử dụng';
    case 422: return 'Thông tin chưa đầy đủ. Vui lòng điền lại';
    case 500:
    case 502:
    case 503: return 'Lỗi máy chủ. Vui lòng thử lại sau';
    default: return `Lỗi không xác định (${status ?? 'unknown'})`;
  }
}

// ─── Slug Generator ───────────────────────────────────────────────────────────

/** Converts a company name to a URL-safe slug */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

// ─── Display Labels ───────────────────────────────────────────────────────────

export const INDUSTRY_LABELS: Record<TenantIndustry, string> = {
  manufacturing: 'Sản xuất / Chế tạo',
  retail: 'Bán lẻ / Thương mại',
  construction: 'Xây dựng',
  logistics: 'Logistics / Vận chuyển',
  hospitality: 'Khách sạn / Nhà hàng',
  healthcare: 'Y tế / Dược phẩm',
  education: 'Giáo dục / Đào tạo',
  other: 'Khác',
};

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  vi: '🇻🇳 Tiếng Việt',
  en: '🇺🇸 English',
  ja: '🇯🇵 日本語',
  ko: '🇰🇷 한국어',
};

export const TIMEZONE_LABELS: Record<AppTimezone, string> = {
  'Asia/Ho_Chi_Minh': 'GMT+7 – Hà Nội / TP. HCM',
};

export const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: '#64748B',
  starter: '#2563EB',
  professional: '#7C3AED',
  enterprise: '#D97706',
};

/** Formats a plan's employee limit for display */
export function formatEmployeeLimit(limit: number): string {
  return limit === -1 ? 'Không giới hạn' : `${limit.toLocaleString('vi-VN')} nhân viên`;
}

/** Formats storage limit for display */
export function formatStorageLimit(gb: number): string {
  return gb === -1 ? 'Không giới hạn' : `${gb} GB`;
}

/** Formats plan price for display */
export function formatPlanPrice(vnd: number): string {
  if (vnd === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(vnd) + '/tháng';
}

// ─── Plan Definitions (client-side fallback) ──────────────────────────────────

export const DEFAULT_PLAN_DETAILS: PlanDetail[] = [
  {
    plan: 'free',
    label: 'Free',
    price_vnd_per_month: 0,
    employee_limit: 10,
    storage_limit_gb: 1,
    features: ['Check-in GPS', 'Báo cáo cơ bản', 'Hỗ trợ email'],
  },
  {
    plan: 'starter',
    label: 'Starter',
    price_vnd_per_month: 500_000,
    employee_limit: 50,
    storage_limit_gb: 10,
    features: ['Tất cả Free', 'Face ID', 'Random Check', 'Xuất Excel'],
  },
  {
    plan: 'professional',
    label: 'Professional',
    price_vnd_per_month: 1_500_000,
    employee_limit: 200,
    storage_limit_gb: 50,
    features: ['Tất cả Starter', 'Multi-shift', 'API access', 'Hỗ trợ ưu tiên'],
  },
  {
    plan: 'enterprise',
    label: 'Enterprise',
    price_vnd_per_month: 0,
    employee_limit: -1,
    storage_limit_gb: -1,
    features: ['Tất cả Professional', 'SLA 99.9%', 'Custom integration', 'Dedicated support'],
  },
];
