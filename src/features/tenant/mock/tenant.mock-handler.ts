import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { DEFAULT_PLAN_DETAILS } from '../utils';
import { MOCK_TENANTS } from './mock-data';
import type { CreateTenantRequest, Tenant, UpdateTenantSettingsRequest } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type MockResult =
  | { response: AxiosResponse; error?: never }
  | { error: AxiosError; response?: never };

// ─── In-memory state ──────────────────────────────────────────────────────────

let tenants: Tenant[] = [...MOCK_TENANTS];

const MOCK_DELAY_MS = 350;

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePath(url: string | undefined): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api/, '')
    .split('?')[0]
    .replace(/\/$/, '');
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
  if (typeof config.data === 'string') return JSON.parse(config.data) as T;
  return config.data as T;
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): MockResult {
  return {
    response: { data, status, statusText: 'OK', headers: {}, config },
  };
}

function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string,
  error_code?: string,
): MockResult {
  const data = { message, error_code };
  const error = new AxiosError(message, String(status), config, undefined, {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config,
  });
  return { error };
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

async function handleCreateTenant(config: InternalAxiosRequestConfig): Promise<MockResult> {
  const body = parseBody<CreateTenantRequest>(config);

  const slugConflict = tenants.some((t) => t.slug === body.slug);
  if (slugConflict) {
    return fail(config, 409, 'Tên miền (slug) này đã được sử dụng', 'SLUG_CONFLICT');
  }

  const now = new Date().toISOString();
  const newTenant: Tenant = {
    id: `tenant-${Date.now()}`,
    name: body.name,
    slug: body.slug,
    logo_url: body.logo_url,
    industry: body.industry,
    status: 'trial',
    employee_count: 0,
    created_at: now,
    updated_at: now,
    subscription: {
      plan: body.plan,
      starts_at: now,
      ends_at:
        body.plan === 'enterprise'
          ? null
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      employee_limit: body.plan === 'free' ? 10 : body.plan === 'starter' ? 50 : 200,
      storage_limit_gb: body.plan === 'free' ? 1 : body.plan === 'starter' ? 10 : 50,
      api_call_limit: body.plan === 'enterprise' ? -1 : 10_000,
      is_active: true,
    },
    settings: {
      ...body.settings,
    },
  };

  tenants = [...tenants, newTenant];
  return ok(config, newTenant, 201);
}

async function handleGetTenantList(config: InternalAxiosRequestConfig): Promise<MockResult> {
  return ok(config, {
    items: tenants,
    total: tenants.length,
    page: 1,
    page_size: tenants.length,
  });
}

async function handleGetTenant(
  config: InternalAxiosRequestConfig,
  id: string,
): Promise<MockResult> {
  const tenant = tenants.find((t) => t.id === id || t.slug === id);
  if (!tenant) return fail(config, 404, 'Không tìm thấy công ty');
  return ok(config, tenant);
}

async function handleGetMyTenant(config: InternalAxiosRequestConfig): Promise<MockResult> {
  // In mock, always return the first tenant for any authenticated user
  return ok(config, tenants[0]);
}

async function handleUpdateTenant(
  config: InternalAxiosRequestConfig,
  id: string,
): Promise<MockResult> {
  const idx = tenants.findIndex((t) => t.id === id);
  if (idx === -1) return fail(config, 404, 'Không tìm thấy công ty');

  const body = parseBody<Partial<Tenant>>(config);
  tenants[idx] = { ...tenants[idx], ...body, updated_at: new Date().toISOString() };
  return ok(config, tenants[idx]);
}

async function handleGetSettings(
  config: InternalAxiosRequestConfig,
  id: string,
): Promise<MockResult> {
  const tenant = tenants.find((t) => t.id === id);
  if (!tenant) return fail(config, 404, 'Không tìm thấy công ty');
  return ok(config, tenant.settings);
}

async function handleUpdateSettings(
  config: InternalAxiosRequestConfig,
  id: string,
): Promise<MockResult> {
  const idx = tenants.findIndex((t) => t.id === id);
  if (idx === -1) return fail(config, 404, 'Không tìm thấy công ty');

  const body = parseBody<UpdateTenantSettingsRequest>(config);
  tenants[idx].settings = { ...tenants[idx].settings, ...body };
  return ok(config, tenants[idx].settings);
}

async function handleGetSubscription(
  config: InternalAxiosRequestConfig,
  id: string,
): Promise<MockResult> {
  const tenant = tenants.find((t) => t.id === id);
  if (!tenant) return fail(config, 404, 'Không tìm thấy công ty');
  return ok(config, tenant.subscription);
}

async function handleGetPlans(config: InternalAxiosRequestConfig): Promise<MockResult> {
  return ok(config, DEFAULT_PLAN_DETAILS);
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────

/** Returns null when the path is not a tenant route. */
export async function handleTenantMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<MockResult | null> {
  const path = normalizePath(config.url);
  const method = (config.method ?? 'get').toLowerCase();

  // /plans
  if (method === 'get' && path === '/plans') {
    await delay();
    return handleGetPlans(config);
  }

  if (!path.startsWith('/tenants')) return null;

  await delay();

  // /tenants/me
  if (method === 'get' && path === '/tenants/me') return handleGetMyTenant(config);

  // /tenants (list / create)
  if (path === '/tenants') {
    if (method === 'post') return handleCreateTenant(config);
    if (method === 'get') return handleGetTenantList(config);
  }

  // /tenants/:id/settings
  const settingsMatch = path.match(/^\/tenants\/([^/]+)\/settings$/);
  if (settingsMatch) {
    const id = settingsMatch[1];
    if (method === 'get') return handleGetSettings(config, id);
    if (method === 'patch') return handleUpdateSettings(config, id);
  }

  // /tenants/:id/subscription
  const subMatch = path.match(/^\/tenants\/([^/]+)\/subscription$/);
  if (subMatch) {
    if (method === 'get') return handleGetSubscription(config, subMatch[1]);
  }

  // /tenants/:id
  const idMatch = path.match(/^\/tenants\/([^/]+)$/);
  if (idMatch) {
    const id = idMatch[1];
    if (method === 'get') return handleGetTenant(config, id);
    if (method === 'patch') return handleUpdateTenant(config, id);
  }

  return fail(config, 404, `[Mock] Route không hỗ trợ: ${method.toUpperCase()} ${path}`);
}
