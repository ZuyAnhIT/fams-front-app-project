import { isAxiosError } from 'axios';

import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

interface MonthlyAttendanceMeResponse {
  employeeId: string | null;
}

/**
 * Chỉ dùng field employeeId trong response — không có employee profile trong
 * tenant (404) là trạng thái hợp lệ, trả về null thay vì throw.
 */
export async function getCurrentEmployeeId(
  tenantId: string,
  year: number,
  month: number,
): Promise<string | null> {
  try {
    const { data } = await apiClient.get(`/tenants/${tenantId}/attendance/me/monthly`, {
      params: { year, month },
    });
    const payload = unwrapApiData<MonthlyAttendanceMeResponse>(data);
    return payload.employeeId ?? null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
