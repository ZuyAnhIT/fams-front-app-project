import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';
import type { EmployeeDashboard, SupervisorDashboard } from '../types/dashboard.type';

export async function getEmployeeDashboard(tenantId: string): Promise<EmployeeDashboard> {
  const { data } = await apiClient.get(`/tenants/${tenantId}/dashboard/employee`);
  return unwrapApiData<EmployeeDashboard>(data);
}

export async function getSupervisorDashboard(tenantId: string): Promise<SupervisorDashboard> {
  const { data } = await apiClient.get(`/tenants/${tenantId}/dashboard/supervisor`);
  return unwrapApiData<SupervisorDashboard>(data);
}
