import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import type { Assignment, AssignmentListParams, Site, SiteListParams } from '../types/Site';
import { buildMockSiteDetail, MOCK_ASSIGNMENTS, MOCK_SITES } from './mock-data';

type MockResult =
  | { response: AxiosResponse; error?: never }
  | { error: AxiosError; response?: never };

const MOCK_DELAY_MS = 300;

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePath(url: string | undefined): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api\/v1/, '')
    .replace(/^\/api/, '')
    .split('?')[0]
    .replace(/\/$/, '');
}

function parseListQuery(config: InternalAxiosRequestConfig): SiteListParams {
  const url = config.url ?? '';
  const queryString = url.includes('?') ? url.split('?')[1] : '';
  const params = new URLSearchParams(queryString);

  const page = Number(params.get('page') ?? '0');
  const size = Number(params.get('size') ?? '20');

  return {
    page: Number.isFinite(page) ? page : 0,
    size: Number.isFinite(size) ? size : 20,
    search: params.get('search') ?? undefined,
    status: (params.get('status') as SiteListParams['status']) ?? undefined,
    sortBy: (params.get('sortBy') as SiteListParams['sortBy']) ?? 'name',
    sortDir: (params.get('sortDir') as SiteListParams['sortDir']) ?? 'asc',
  };
}

function parseAssignmentQuery(config: InternalAxiosRequestConfig): AssignmentListParams {
  const url = config.url ?? '';
  const queryString = url.includes('?') ? url.split('?')[1] : '';
  const params = new URLSearchParams(queryString);

  return {
    status: (params.get('status') as AssignmentListParams['status']) ?? undefined,
    role: (params.get('role') as AssignmentListParams['role']) ?? undefined,
  };
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): MockResult {
  return {
    response: { data, status, statusText: 'OK', headers: {}, config },
  };
}

function fail(config: InternalAxiosRequestConfig, status: number, message: string): MockResult {
  const data = { message };
  const error = new AxiosError(message, String(status), config, undefined, {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config,
  });
  return { error };
}

function applyFilters(items: Site[], params: SiteListParams): Site[] {
  let result = [...items];

  if (params.status) {
    result = result.filter((s) => s.status === params.status);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code?.toLowerCase().includes(q) ?? false) ||
        (s.address?.toLowerCase().includes(q) ?? false),
    );
  }

  const dir = params.sortDir === 'desc' ? -1 : 1;
  result.sort((a, b) => a.name.localeCompare(b.name) * dir);

  return result;
}

function handleList(config: InternalAxiosRequestConfig): MockResult {
  const params = parseListQuery(config);
  const page = params.page ?? 0;
  const size = params.size ?? 20;

  const filtered = applyFilters(MOCK_SITES, params);
  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const content = filtered.slice(start, start + size);

  return ok(config, {
    success: true,
    message: 'Success',
    data: {
      content,
      page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
    },
  });
}

function handleDetail(config: InternalAxiosRequestConfig, siteId: string): MockResult {
  const detail = buildMockSiteDetail(siteId);
  if (!detail) return fail(config, 404, 'Không tìm thấy công trình');

  return ok(config, {
    success: true,
    message: 'Success',
    data: detail,
  });
}

function handleAssignments(config: InternalAxiosRequestConfig, siteId: string): MockResult {
  const params = parseAssignmentQuery(config);
  let content: Assignment[] = MOCK_ASSIGNMENTS[siteId] ?? [];

  if (params.role) content = content.filter((a) => a.role === params.role);
  if (params.status) content = content.filter((a) => a.status === params.status);

  return ok(config, {
    success: true,
    message: 'Success',
    data: {
      content,
      page: 0,
      size: content.length,
      totalElements: content.length,
      totalPages: 1,
      first: true,
      last: true,
    },
  });
}

/** Returns null when the path is not a site/tenant-sites route. */
export async function handleSiteMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<MockResult | null> {
  const path = normalizePath(config.url);
  const method = (config.method ?? 'get').toLowerCase();

  const sitesMatch = path.match(/^\/tenants\/[^/]+\/sites(\/.*)?$/);
  if (!sitesMatch) return null;

  await delay();

  if (method === 'get' && /^\/tenants\/[^/]+\/sites$/.test(path)) {
    return handleList(config);
  }

  const assignmentsMatch = path.match(/^\/tenants\/[^/]+\/sites\/([^/]+)\/assignments$/);
  if (method === 'get' && assignmentsMatch) {
    return handleAssignments(config, assignmentsMatch[1]);
  }

  const detailMatch = path.match(/^\/tenants\/[^/]+\/sites\/([^/]+)$/);
  if (method === 'get' && detailMatch) {
    return handleDetail(config, detailMatch[1]);
  }

  return fail(config, 404, `[Mock] Route không hỗ trợ: ${method.toUpperCase()} ${path}`);
}
