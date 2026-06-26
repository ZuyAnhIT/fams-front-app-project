import { apiClient } from '@/services/api-client';

import type {
  CreateTenantRequest,
  PlanDetail,
  Subscription,
  Tenant,
  TenantListParams,
  TenantListResponse,
  TenantSettings,
  UpdateTenantRequest,
  UpdateTenantSettingsRequest,
} from './types';

const BASE = '/tenants';

// ─── Tenant CRUD ──────────────────────────────────────────────────────────────

/** Platform Admin: create a new tenant and return the created record */
export async function createTenant(body: CreateTenantRequest): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>(BASE, body);
  return data;
}

/**
 * Platform Admin: list all tenants with optional filtering.
 * Regular admin can only see their own tenant via getTenant().
 */
export async function getTenantList(
  params?: TenantListParams,
): Promise<TenantListResponse> {
  const { data } = await apiClient.get<TenantListResponse>(BASE, { params });
  return data;
}

/** Get full tenant details by ID */
export async function getTenant(id: string): Promise<Tenant> {
  const { data } = await apiClient.get<Tenant>(`${BASE}/${id}`);
  return data;
}

/** Get the currently authenticated user's tenant */
export async function getMyTenant(): Promise<Tenant> {
  const { data } = await apiClient.get<Tenant>(`${BASE}/me`);
  return data;
}

/** Update tenant basic info (name, logo, industry) */
export async function updateTenant(
  id: string,
  body: UpdateTenantRequest,
): Promise<Tenant> {
  const { data } = await apiClient.patch<Tenant>(`${BASE}/${id}`, body);
  return data;
}

// ─── Tenant Settings ──────────────────────────────────────────────────────────

/** Get the settings for a tenant */
export async function getTenantSettings(id: string): Promise<TenantSettings> {
  const { data } = await apiClient.get<TenantSettings>(`${BASE}/${id}/settings`);
  return data;
}

/** Partial update to tenant settings */
export async function updateTenantSettings(
  id: string,
  body: UpdateTenantSettingsRequest,
): Promise<TenantSettings> {
  const { data } = await apiClient.patch<TenantSettings>(
    `${BASE}/${id}/settings`,
    body,
  );
  return data;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

/** Get the current subscription for a tenant */
export async function getTenantSubscription(id: string): Promise<Subscription> {
  const { data } = await apiClient.get<Subscription>(
    `${BASE}/${id}/subscription`,
  );
  return data;
}

/** Platform Admin: fetch all available plan definitions */
export async function getAvailablePlans(): Promise<PlanDetail[]> {
  const { data } = await apiClient.get<PlanDetail[]>('/plans');
  return data;
}
