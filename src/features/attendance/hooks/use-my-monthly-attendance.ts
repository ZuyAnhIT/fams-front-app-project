import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getMyMonthlyAttendance, type AttendanceMonth } from '../services/attendance.service';

export const attendanceKeys = {
  all: ['attendance'] as const,
  monthly: (tenantId: string, period: AttendanceMonth) =>
    [...attendanceKeys.all, 'me', 'monthly', tenantId, period.year, period.month] as const,
};

export function useMyMonthlyAttendance(period: AttendanceMonth) {
  const tenantId = useAuthStore((state) => state.activeTenantId);

  return useQuery({
    queryKey: attendanceKeys.monthly(tenantId ?? '', period),
    queryFn: () => getMyMonthlyAttendance(tenantId!, period),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}
