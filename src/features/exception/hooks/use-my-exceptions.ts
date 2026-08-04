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

export function useMyExceptions(size = 50) {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const query = useQuery({
    queryKey: exceptionKeys.all(tenantId ?? ''),
    queryFn: () => getMyExceptions(tenantId!, size),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
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
