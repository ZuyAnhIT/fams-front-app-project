import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store';

import {
  getMyPendingRandomChecks,
  getMyRandomCheckResult,
  submitRandomCheckResponse,
} from '../services/random-check.service';
import type { SubmitRandomCheckPayload } from '../types/random-check.type';
import { randomCheckErrorMessage } from '../utils/random-check.utils';

export const randomCheckKeys = {
  all: ['random-check'] as const,
  pending: (tenantId: string) => [...randomCheckKeys.all, 'pending', tenantId] as const,
  result: (tenantId: string, checkId: string) =>
    [...randomCheckKeys.all, 'result', tenantId, checkId] as const,
};

export function useMyPendingRandomChecks() {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const query = useQuery({
    queryKey: randomCheckKeys.pending(tenantId ?? ''),
    queryFn: () => getMyPendingRandomChecks(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5_000,
    refetchInterval: (currentQuery) =>
      currentQuery.state.data?.some((item) => item.status === 'sent') ? 10_000 : 30_000,
  });

  return {
    ...query,
    checks: query.data ?? [],
  };
}

export function useMyRandomCheckResult(checkId: string, enabled: boolean) {
  const tenantId = useAuthStore((state) => state.activeTenantId);

  return useQuery({
    queryKey: randomCheckKeys.result(tenantId ?? '', checkId),
    queryFn: () => getMyRandomCheckResult(tenantId!, checkId),
    enabled: Boolean(tenantId && checkId && enabled),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.processingStatus === 'completed' ? false : 4_000,
  });
}

export function useSubmitRandomCheck() {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: ({
      checkId,
      payload,
    }: {
      checkId: string;
      payload: SubmitRandomCheckPayload;
    }) => submitRandomCheckResponse(tenantId!, checkId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: randomCheckKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['attendance'] }),
      ]);
      showToast('Đã gửi phản hồi kiểm tra', 'success');
    },
    onError: (error) => showToast(randomCheckErrorMessage(error), 'error'),
  });

  return {
    submit: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error,
  };
}
