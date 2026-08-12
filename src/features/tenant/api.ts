import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  CreateTenantRequest,
  PlanDetail,
  Subscription,
  Tenant,
  TenantListParams,
  TenantListResponse,
  TenantDisplaySettings,
  UpdateTenantRequest,
  UpdateTenantSettingsRequest,
} from './types';

const BASE = '/tenants';

// ─── Tenant CRUD ──────────────────────────────────────────────────────────────

/** Platform Admin: create a new tenant and return the created record */
export async function createTenant(body: CreateTenantRequest): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>(BASE, body);
  return unwrapApiData<Tenant>(data);
}

/**
 * Platform Admin: list all tenants with optional filtering.
 * Regular admin can only see their own tenant via getTenant().
 */
export async function getTenantList(
  params?: TenantListParams,
): Promise<TenantListResponse> {
  const { data } = await apiClient.get(BASE, { params });
  const page = unwrapApiData<{
    items?: Tenant[];
    content?: Tenant[];
    total?: number;
    totalElements?: number;
    page?: number;
    page_size?: number;
    size?: number;
  }>(data);

  return {
    items: page.items ?? page.content ?? [],
    total: page.total ?? page.totalElements ?? 0,
    page: page.page ?? 0,
    page_size: page.page_size ?? page.size ?? 0,
  };
}

/** Get full tenant details by ID */
export async function getTenant(id: string): Promise<Tenant> {
  const { data } = await apiClient.get<Tenant>(`${BASE}/${id}`);
  return unwrapApiData<Tenant>(data);
}

/** Get the currently authenticated user's tenant */
export async function getMyTenant(): Promise<Tenant> {
  const { data } = await apiClient.get<Tenant>(`${BASE}/me`);
  return unwrapApiData<Tenant>(data);
}

/** Update tenant basic info (name, logo, industry) */
export async function updateTenant(
  id: string,
  body: UpdateTenantRequest,
): Promise<Tenant> {
  const { data } = await apiClient.patch<Tenant>(`${BASE}/${id}`, body);
  return unwrapApiData<Tenant>(data);
}

// ─── Tenant Settings ──────────────────────────────────────────────────────────

/** Get the settings for a tenant */
export async function getTenantSettings(id: string): Promise<TenantDisplaySettings> {
  const { data } = await apiClient.get<TenantDisplaySettings>(`${BASE}/${id}/settings`);
  return unwrapApiData<TenantDisplaySettings>(data);
}

/** Partial update to tenant settings */
export async function updateTenantSettings(
  id: string,
  body: UpdateTenantSettingsRequest,
): Promise<TenantDisplaySettings> {
  const { data } = await apiClient.patch<TenantDisplaySettings>(
    `${BASE}/${id}/settings`,
    body,
  );
  return unwrapApiData<TenantDisplaySettings>(data);
}

// ─── Subscription ─────────────────────────────────────────────────────────────

/** Get the current subscription for a tenant */
export async function getTenantSubscription(id: string): Promise<Subscription> {
  const { data } = await apiClient.get<Subscription>(
    `${BASE}/${id}/subscription`,
  );
  return unwrapApiData<Subscription>(data);
}

/** Platform Admin: fetch all available plan definitions */
export async function getAvailablePlans(): Promise<PlanDetail[]> {
  const { data } = await apiClient.get<PlanDetail[]>('/plans');
  return unwrapApiData<PlanDetail[]>(data);
}
