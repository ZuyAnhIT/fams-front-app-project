import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type { AttendanceMonthly } from '../types/attendance.type';

export interface AttendanceMonth {
  year: number;
  month: number;
  /** #85 (2026-08-17): lets an employee working multiple sites narrow their own timesheet down
   *  to one site instead of always seeing every site merged together. */
  siteId?: string;
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
