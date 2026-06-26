// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'trial';

export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export type TenantIndustry =
  | 'manufacturing'
  | 'retail'
  | 'construction'
  | 'logistics'
  | 'hospitality'
  | 'healthcare'
  | 'education'
  | 'other';

export type AppLanguage = 'vi' | 'en' | 'ja' | 'ko';

export type AppTimezone =
  | 'Asia/Ho_Chi_Minh'
  | 'Asia/Bangkok'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'UTC';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  /** URL-friendly unique identifier, e.g. "my-company" */
  slug: string;
  logo_url?: string;
  industry: TenantIndustry;
  status: TenantStatus;
  /** ISO 8601 */
  created_at: string;
  /** ISO 8601 */
  updated_at: string;
  subscription: Subscription;
  settings: TenantSettings;
  /** Number of active employees */
  employee_count: number;
}

export interface TenantSettings {
  language: AppLanguage;
  timezone: AppTimezone;
  /** Hex color, e.g. "#2563EB" */
  brand_color: string;
  notifications_enabled: boolean;
  /** Notify manager on late check-in */
  late_checkin_alert: boolean;
  /** Minutes before shift that check-in window opens */
  checkin_early_minutes: number;
  /** GPS geofence radius in meters */
  geofence_radius_meters: number;
  /** Require Face ID for check-in */
  require_face_id: boolean;
  /** Allow random check feature */
  random_check_enabled: boolean;
}

export interface Subscription {
  plan: SubscriptionPlan;
  /** ISO 8601 */
  starts_at: string;
  /** ISO 8601 – null for unlimited (enterprise) */
  ends_at: string | null;
  /** Max number of employees; -1 = unlimited */
  employee_limit: number;
  /** Storage in GB; -1 = unlimited */
  storage_limit_gb: number;
  /** Monthly API call quota; -1 = unlimited */
  api_call_limit: number;
  is_active: boolean;
}

export interface PlanDetail {
  plan: SubscriptionPlan;
  label: string;
  price_vnd_per_month: number;
  employee_limit: number;
  storage_limit_gb: number;
  features: string[];
}

// ─── Request Types ────────────────────────────────────────────────────────────

export interface CreateTenantRequest {
  /** Step 1: Basic info */
  name: string;
  slug: string;
  logo_url?: string;
  industry: TenantIndustry;
  /** Step 2: Settings */
  settings: Omit<TenantSettings, 'brand_color'> & { brand_color: string };
  /** Step 3: Plan selection */
  plan: SubscriptionPlan;
}

export interface UpdateTenantRequest {
  name?: string;
  logo_url?: string;
  industry?: TenantIndustry;
}

export interface UpdateTenantSettingsRequest extends Partial<TenantSettings> {}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface TenantListResponse {
  items: Tenant[];
  total: number;
  page: number;
  page_size: number;
}

export interface TenantListParams {
  page?: number;
  page_size?: number;
  status?: TenantStatus;
  search?: string;
}

// ─── Wizard State ─────────────────────────────────────────────────────────────

/** Local form state aggregated across wizard steps */
export interface TenantWizardData {
  /** Step 1 */
  name: string;
  slug: string;
  logo_url: string;
  industry: TenantIndustry;
  /** Step 2 */
  language: AppLanguage;
  timezone: AppTimezone;
  brand_color: string;
  notifications_enabled: boolean;
  late_checkin_alert: boolean;
  checkin_early_minutes: number;
  geofence_radius_meters: number;
  require_face_id: boolean;
  random_check_enabled: boolean;
  /** Step 3 */
  plan: SubscriptionPlan;
}

export const WIZARD_STEP_COUNT = 3;

export type WizardStep = 1 | 2 | 3;

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  1: 'Thông tin',
  2: 'Cài đặt',
  3: 'Xác nhận',
};
