import { useQueries, useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getEmployeeSummary, getSiteAssignments } from '../services/site.service';
import type { Assignment } from '../types/Site';
import { siteKeys } from './use-site-list';

export interface SiteSupervisor {
  assignment: Assignment;
  name: string | null;
  isLoadingName: boolean;
}

export interface UseSiteSupervisorsResult {
  supervisors: SiteSupervisor[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Backend không có endpoint gộp sẵn "danh sách supervisor kèm tên" cho 1 site,
 * cũng không có batch-by-ids cho employee. Lấy assignments role=supervisor rồi
 * gọi riêng GET /tenants/{tenantId}/employees/{employeeId} cho từng employeeId
 * (N+1) để ghép firstName+lastName.
 */
export function useSiteSupervisors(siteId: string): UseSiteSupervisorsResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const assignmentsQuery = useQuery({
    queryKey: siteKeys.assignments(tenantId ?? '', siteId),
    queryFn: () =>
      getSiteAssignments(tenantId!, siteId, {
        role: 'supervisor',
        status: 'active',
        size: 50,
      }),
    enabled: !!tenantId && !!siteId,
    staleTime: 60 * 1000,
  });

  const assignments = assignmentsQuery.data?.content ?? [];

  const employeeQueries = useQueries({
    queries: assignments.map((assignment) => ({
      queryKey: ['employees', tenantId, assignment.employeeId] as const,
      queryFn: () => getEmployeeSummary(tenantId!, assignment.employeeId),
      enabled: !!tenantId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const supervisors: SiteSupervisor[] = assignments.map((assignment, index) => {
    const employeeQuery = employeeQueries[index];
    const employee = employeeQuery?.data;
    return {
      assignment,
      name: employee ? `${employee.firstName} ${employee.lastName}`.trim() : null,
      isLoadingName: employeeQuery?.isLoading ?? false,
    };
  });

  return {
    supervisors,
    isLoading: assignmentsQuery.isLoading,
    isError: assignmentsQuery.isError,
    error: assignmentsQuery.error,
    refetch: () => {
      void assignmentsQuery.refetch();
    },
  };
}
