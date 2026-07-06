import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  AssignmentListParams,
  AssignmentListResponse,
  EmployeeSummary,
  SiteDetailResponse,
  SiteListParams,
  SiteListResponse,
} from '../types/Site';

function siteBase(tenantId: string): string {
  return `/tenants/${tenantId}/sites`;
}

export async function getSites(
  tenantId: string,
  params?: SiteListParams,
): Promise<SiteListResponse> {
  const { data } = await apiClient.get(siteBase(tenantId), { params });
  return unwrapApiData<SiteListResponse>(data);
}

export async function getSiteDetail(
  tenantId: string,
  siteId: string,
): Promise<SiteDetailResponse> {
  const { data } = await apiClient.get(`${siteBase(tenantId)}/${siteId}`);
  return unwrapApiData<SiteDetailResponse>(data);
}

export async function getSiteAssignments(
  tenantId: string,
  siteId: string,
  params?: AssignmentListParams,
): Promise<AssignmentListResponse> {
  const { data } = await apiClient.get(`${siteBase(tenantId)}/${siteId}/assignments`, {
    params,
  });
  return unwrapApiData<AssignmentListResponse>(data);
}

/** Không có endpoint batch-by-ids; phải gọi từng employeeId một (N+1). */
export async function getEmployee(tenantId: string, employeeId: string): Promise<EmployeeSummary> {
  const { data } = await apiClient.get(`/tenants/${tenantId}/employees/${employeeId}`);
  return unwrapApiData<EmployeeSummary>(data);
}
