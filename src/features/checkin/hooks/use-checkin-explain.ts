import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { useToast } from '@/components/ui/toast';

import { submitExplanation } from '../services/checkin.service';
import type { SubmitExplanationRequest } from '../types/checkin.type';
import { checkinKeys } from './use-checkin';

/**
 * Bonus: giải trình check-in invalid/pending_review.
 * Cần xác nhận thêm: field chính xác của request/response (đặc biệt cách gửi ảnh giải trình).
 */
export function useCheckinExplain(checkinId: string) {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: SubmitExplanationRequest) =>
      submitExplanation(tenantId!, checkinId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: checkinKeys.result(tenantId ?? '', checkinId) });
      showToast('Đã gửi giải trình.', 'success');
    },
    onError: () => {
      showToast('Gửi giải trình thất bại, vui lòng thử lại.', 'error');
    },
  });

  return {
    submitExplanation: (payload: SubmitExplanationRequest) => mutation.mutateAsync(payload),
    isSubmitting: mutation.isPending,
  };
}
