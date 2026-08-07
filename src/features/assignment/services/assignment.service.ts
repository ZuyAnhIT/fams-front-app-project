import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  AssignmentListParams,
  AssignmentListResponse,
  SiteListParams,
  SiteListResponse,
} from '../types/assignment.type';

/**
 * Backend không có endpoint tenant-wide `GET /tenants/{tenantId}/assignments`.
 * Assignment luôn được liệt kê theo 1 site cụ thể — xem "Cần xác nhận thêm".
 */
export async function getAssignments(
  tenantId: string,
  siteId: string,
  params?: AssignmentListParams,
): Promise<AssignmentListResponse> {
  const { data } = await apiClient.get(
    `/tenants/${tenantId}/sites/${siteId}/assignments`,
    { params },
  );
  return unwrapApiData<AssignmentListResponse>(data);
}

/** Danh sách site để chọn "site cần xem phân công" (dropdown filter). */
export async function getSitesForFilter(
  tenantId: string,
  params?: SiteListParams,
): Promise<SiteListResponse> {
  const { data } = await apiClient.get(`/tenants/${tenantId}/sites`, { params });
  return unwrapApiData<SiteListResponse>(data);
}
