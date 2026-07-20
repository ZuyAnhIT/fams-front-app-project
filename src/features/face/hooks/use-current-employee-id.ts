import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getCurrentEmployeeId } from '../services/employee-id.service';

export const employeeIdKeys = {
  current: (tenantId: string, year: number, month: number) =>
    ['face', 'current-employee-id', tenantId, year, month] as const,
};

/**
 * Nguồn duy nhất cho employeeId của người dùng hiện tại — mọi nơi cần
 * employeeId cho Face-ID phải dùng hook này, không dùng user.id.
 *
 * employeeId = null là trạng thái hợp lệ (tài khoản không có employee
 * profile trong tenant hiện tại), không phải lỗi.
 */
export function useCurrentEmployeeId() {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const query = useQuery({
    queryKey: employeeIdKeys.current(tenantId ?? '', year, month),
    queryFn: () => getCurrentEmployeeId(tenantId as string, year, month),
    enabled: !!tenantId,
    staleTime: 60 * 60 * 1000,
  });

  return {
    employeeId: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
