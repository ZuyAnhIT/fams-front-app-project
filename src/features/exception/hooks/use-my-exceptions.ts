import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store';

import { getMyExceptions, submitExceptionExplanation } from '../services/exception.service';
import type { MyExceptionItem, SubmitExceptionExplanationRequest } from '../types/exception.type';

export const exceptionKeys = {
  all: (tenantId: string) => ['my-exceptions', tenantId] as const,
};

function getErrorMessage(error: unknown): string {
  const data = (error as {
    response?: { data?: { userMessage?: string; message?: string } };
  }).response?.data;
  return data?.userMessage || data?.message || 'Không thể gửi giải trình. Vui lòng thử lại.';
}

function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export function useMyExceptions(size = 50) {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const query = useQuery({
    queryKey: exceptionKeys.all(tenantId ?? ''),
    queryFn: () => getMyExceptions(tenantId!, size),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    // 403/404 = this account has no employee profile in the active company (#19) — a stable
    // state, not a transient failure. Don't retry it.
    retry: (failureCount, error) => {
      const status = errorStatus(error);
      return status !== 403 && status !== 404 && failureCount < 2;
    },
  });

  // A 404 means "no employee profile here" → the correct UX is an empty inbox, not a red
  // "cloud offline" error (backend now returns an empty 200 for this, this is the safety net
  // for other 404 causes / older backends).
  const noProfile = errorStatus(query.error) === 404;

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError && !noProfile,
    refetch: query.refetch,
  };
}

export function useSubmitExceptionExplanation() {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: ({
      item,
      payload,
    }: {
      item: MyExceptionItem;
      payload: SubmitExceptionExplanationRequest;
    }) => submitExceptionExplanation(tenantId!, item.explainEndpoint, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: exceptionKeys.all(tenantId ?? '') }),
        queryClient.invalidateQueries({ queryKey: ['checkin'] }),
      ]);
      showToast('Đã gửi giải trình cho quản lý.', 'success');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  return {
    submit: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
  };
}
