import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  EmployeePendingCheck,
  MyRandomCheckResult,
  RandomCheckResponse,
  SubmitRandomCheckPayload,
} from '../types/random-check.type';

export async function getMyPendingRandomChecks(
  tenantId: string,
): Promise<EmployeePendingCheck[]> {
  const { data } = await apiClient.get(
    `/tenants/${tenantId}/scheduled-checks/my-pending`,
  );
  return unwrapApiData<EmployeePendingCheck[]>(data);
}

export async function getMyRandomCheckResult(
  tenantId: string,
  checkId: string,
): Promise<MyRandomCheckResult> {
  const { data } = await apiClient.get(
    `/tenants/${tenantId}/scheduled-checks/${checkId}/my-result`,
  );
  return unwrapApiData<MyRandomCheckResult>(data);
}

export async function submitRandomCheckResponse(
  tenantId: string,
  checkId: string,
  payload: SubmitRandomCheckPayload,
): Promise<RandomCheckResponse> {
  const { data } = await apiClient.post(
    `/tenants/${tenantId}/scheduled-checks/${checkId}/respond`,
    payload,
  );
  return unwrapApiData<RandomCheckResponse>(data);
}
