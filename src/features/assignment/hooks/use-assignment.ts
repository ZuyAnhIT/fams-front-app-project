import { useQueries, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/features/auth/store';
import { getSiteDetail } from '@/features/site/services/site.service';

import { getAssignments, getEmployee, getSitesForFilter } from '../services/assignment.service';
import type { Assignment, AssignmentListParams, Site } from '../types/assignment.type';

export const assignmentKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentKeys.all, 'list'] as const,
  list: (tenantId: string, siteId: string, params: AssignmentListParams) =>
    [...assignmentKeys.lists(), tenantId, siteId, params] as const,
  siteOptions: (tenantId: string) => [...assignmentKeys.all, 'site-options', tenantId] as const,
  siteShifts: (tenantId: string, siteId: string) =>
    [...assignmentKeys.all, 'site-shifts', tenantId, siteId] as const,
};

/** Danh sách site để đổ vào dropdown chọn "site cần xem phân công". */
export function useSiteOptions(): { sites: Site[]; isLoading: boolean } {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: assignmentKeys.siteOptions(tenantId ?? ''),
    queryFn: () => getSitesForFilter(tenantId!, { size: 100, sortBy: 'name', sortDir: 'asc' }),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  return { sites: query.data?.content ?? [], isLoading: query.isLoading };
}

/** Tên ca (shift) của site đang chọn, để hiển thị thay vì chỉ shiftId. */
export function useSiteShiftNames(siteId: string | undefined): Record<string, string> {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: assignmentKeys.siteShifts(tenantId ?? '', siteId ?? ''),
    queryFn: () => getSiteDetail(tenantId!, siteId!),
    enabled: !!tenantId && !!siteId,
    staleTime: 5 * 60 * 1000,
  });

  const shifts = query.data?.shifts ?? [];
  return Object.fromEntries(shifts.map((shift) => [shift.id, shift.name]));
}

export interface AssignmentRow {
  assignment: Assignment;
  employeeName: string | null;
  isLoadingEmployeeName: boolean;
}

export interface UseAssignmentListResult {
  rows: AssignmentRow[];
  page: number;
  totalPages: number;
  totalElements: number;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  isForbidden: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Danh sách phân công của 1 site. Backend không có endpoint tenant-wide, nên
 * site là điều kiện bắt buộc (không phải filter tuỳ chọn) — xem "Cần xác nhận
 * thêm". Quyền `assignments:list` được enforce ở backend; FE không tự chặn
 * theo role (cùng lý do với `useSiteList`, xem site/hooks/use-site-list.ts),
 * chỉ dựa vào 403 để hiển thị trạng thái không có quyền.
 */
export function useAssignmentList(
  siteId: string | undefined,
  params: AssignmentListParams = {},
): UseAssignmentListResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: assignmentKeys.list(tenantId ?? '', siteId ?? '', params),
    queryFn: () => getAssignments(tenantId!, siteId!, params),
    enabled: !!tenantId && !!siteId,
    staleTime: 60 * 1000,
  });

  const assignments = query.data?.content ?? [];

  /** Backend không join tên nhân viên; phải gọi từng employeeId một (N+1). */
  const employeeQueries = useQueries({
    queries: assignments.map((assignment) => ({
      queryKey: ['employees', tenantId, assignment.employeeId] as const,
      queryFn: () => getEmployee(tenantId!, assignment.employeeId),
      enabled: !!tenantId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rows: AssignmentRow[] = assignments.map((assignment, index) => {
    const employeeQuery = employeeQueries[index];
    const employee = employeeQuery?.data;
    return {
      assignment,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}`.trim() : null,
      isLoadingEmployeeName: employeeQuery?.isLoading ?? false,
    };
  });

  const isForbidden = isAxiosError(query.error) && query.error.response?.status === 403;

  return {
    rows,
    page: query.data?.page ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    totalElements: query.data?.totalElements ?? 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    isForbidden,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
