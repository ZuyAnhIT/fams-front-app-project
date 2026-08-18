import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getMyMonthlyAttendance, type AttendanceMonth } from '../services/attendance.service';
import { attendanceKeys } from './use-my-monthly-attendance';

export interface AttendanceSiteOption {
  siteId: string;
  siteName: string;
}

/** #85 gap fix (2026-08-17): distinct sites the employee has attendance for in the selected
 *  month, used to populate the site filter chips — a SEPARATE, always-unfiltered fetch (siteId
 *  omitted) so the chip list itself doesn't collapse down to one option once a site is selected
 *  (the main `useMyMonthlyAttendance(period)` call in the screen is the one that actually
 *  applies the filter). */
export function useMyAttendanceSiteOptions(period: Pick<AttendanceMonth, 'year' | 'month'>) {
  const tenantId = useAuthStore((state) => state.activeTenantId);

  const query = useQuery({
    queryKey: attendanceKeys.monthly(tenantId ?? '', { ...period, siteId: undefined }),
    queryFn: () => getMyMonthlyAttendance(tenantId!, period),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });

  const options = useMemo<AttendanceSiteOption[]>(() => {
    const seen = new Map<string, string>();
    for (const day of query.data?.dailySummaries ?? []) {
      if (!seen.has(day.siteId)) {
        seen.set(day.siteId, day.siteName ?? day.siteId);
      }
    }
    return Array.from(seen, ([siteId, siteName]) => ({ siteId, siteName }));
  }, [query.data]);

  return { options, isLoading: query.isLoading };
}
