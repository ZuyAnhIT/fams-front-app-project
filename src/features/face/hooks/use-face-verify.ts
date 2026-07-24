import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/auth.store';

import { getFaceVerifyResult, submitFaceVerify } from '../services/face.service';
import type { FaceVerifyResultDto } from '../types/FaceId';
import { parseFaceIdError, prepareFaceImageBase64 } from '../utils/face-id.utils';

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 15000;

export type FaceVerifyPhase = 'idle' | 'submitting' | 'polling' | 'result' | 'timeout' | 'error';

/**
 * Chụp 1 ảnh → POST /face-id/verify → poll GET /face-id/verify/{id} mỗi 1.5s
 * cho đến khi có kết quả (pass/fail) hoặc quá 15s (timeout).
 */
export function useFaceVerify(employeeId: string | null) {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const { showToast } = useToast();

  const [phase, setPhase] = useState<FaceVerifyPhase>('idle');
  const [verifyRequestId, setVerifyRequestId] = useState<string | null>(null);
  const startedAtRef = useRef(0);

  const submitMutation = useMutation({
    mutationFn: async (photoUri: string) => {
      const photoBase64 = await prepareFaceImageBase64(photoUri);
      return submitFaceVerify(tenantId as string, employeeId as string, photoBase64, true);
    },
    onSuccess: (data) => {
      startedAtRef.current = Date.now();
      setVerifyRequestId(data.verifyRequestId);
      setPhase('polling');
    },
    onError: (error) => {
      setPhase('error');
      showToast(parseFaceIdError(error), 'error');
    },
  });

  const resultQuery = useQuery({
    queryKey: ['face-id', 'verify-result', tenantId ?? '', employeeId ?? '', verifyRequestId ?? ''],
    queryFn: () =>
      getFaceVerifyResult(tenantId as string, employeeId as string, verifyRequestId as string),
    enabled: !!tenantId && !!employeeId && !!verifyRequestId && phase === 'polling',
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? POLL_INTERVAL_MS : false),
    retry: false,
  });

  // Có kết quả (khác "pending") -> dừng poll, hiển thị kết quả.
  useEffect(() => {
    if (phase !== 'polling') return;
    if (resultQuery.data && resultQuery.data.status !== 'pending') {
      setPhase('result');
    }
  }, [resultQuery.data, phase]);

  // Lỗi khi poll (vd. verifyRequestId không hợp lệ) -> dừng, báo lỗi.
  useEffect(() => {
    if (phase !== 'polling' || !resultQuery.isError) return;
    setPhase('error');
    showToast(parseFaceIdError(resultQuery.error), 'error');
  }, [resultQuery.isError, resultQuery.error, phase, showToast]);

  // Quá 15s không có kết quả -> timeout, dừng poll.
  useEffect(() => {
    if (phase !== 'polling') return;
    const timer = setTimeout(() => {
      setPhase((p) => (p === 'polling' ? 'timeout' : p));
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [phase, verifyRequestId]);

  const submitVerify = (photoUri: string) => {
    setPhase('submitting');
    submitMutation.mutate(photoUri);
  };

  const reset = () => {
    setPhase('idle');
    setVerifyRequestId(null);
  };

  return {
    phase,
    result: phase === 'result' ? (resultQuery.data as FaceVerifyResultDto) : null,
    submitVerify,
    reset,
  };
}
