import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store';

import {
  getMyPendingRandomChecks,
  getMyRandomCheckResult,
  submitRandomCheckResponse,
} from '../services/random-check.service';
import type { SubmitRandomCheckPayload } from '../types/random-check.type';
import {
  randomCheckErrorMessage,
  shouldReconcileRandomCheckSubmission,
} from '../utils/random-check.utils';

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
    }) => submitRandomCheckResponse(tenantId!, checkId, payload).catch(async (error) => {
      if (!shouldReconcileRandomCheckSubmission(error)) throw error;

      try {
        const result = await getMyRandomCheckResult(tenantId!, checkId);
        // A timeout does not prove that POST /respond reached the server. Only
        // reconcile when the employee-safe result confirms a stored response.
        if (result.status !== 'responded' || !result.respondedAt) throw error;
        return {
          id: `reconciled:${checkId}`,
          scheduledCheckId: checkId,
          employeeId: '',
          respondedAt: result.respondedAt,
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracyMeters: payload.accuracyMeters ?? null,
          locationVerified: result.locationVerified ?? false,
          faceVerified: result.faceVerified,
          livenessVerified: result.livenessVerified,
          faceVerifyScore: result.faceVerifyScore,
          hasPhotoEvidence: Boolean(payload.employeePhotoBase64),
          outcome: result.outcome ?? 'pass',
          failureReason: result.failureReason,
          createdAt: result.respondedAt,
        };
      } catch {
        throw error;
      }
    }),
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
