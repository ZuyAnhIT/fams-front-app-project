import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getMyAssignments } from '../services/my-assignments.service';

export const myAssignmentsKeys = {
  all: ['my-assignments'] as const,
  list: (tenantId: string) => [...myAssignmentsKeys.all, tenantId] as const,
};

/** Toàn bộ phân công của nhân viên hiện tại, mọi site, mọi trạng thái — mới nhất trước. */
export function useMyAssignments() {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: myAssignmentsKeys.list(tenantId ?? ''),
    queryFn: () => getMyAssignments(tenantId!),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });

  return {
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
