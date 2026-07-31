import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type { AttendanceMonthly } from '../types/attendance.type';

export interface AttendanceMonth {
  year: number;
  month: number;
}

export async function getMyMonthlyAttendance(
  tenantId: string,
  period: AttendanceMonth,
): Promise<AttendanceMonthly> {
  const { data } = await apiClient.get(
    `/tenants/${tenantId}/attendance/me/monthly`,
    { params: period },
  );
  return unwrapApiData<AttendanceMonthly>(data);
}
