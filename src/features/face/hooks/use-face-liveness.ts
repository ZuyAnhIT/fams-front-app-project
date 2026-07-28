import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import {
  startFaceLivenessChallenge,
  submitFaceLivenessFrames,
} from '../services/face.service';
import type {
  FaceImagePayload,
  FaceLivenessPurpose,
} from '../types/FaceId';

export function useFaceLiveness(
  employeeId: string,
  purpose: FaceLivenessPurpose,
  siteId?: string,
) {
  const tenantId = useAuthStore((state) => state.activeTenantId);

  const startMutation = useMutation({
    mutationFn: () =>
      startFaceLivenessChallenge(tenantId as string, employeeId, purpose, siteId),
  });

  const submitMutation = useMutation({
    mutationFn: ({
      challengeId,
      frames,
    }: {
      challengeId: string;
      frames: FaceImagePayload[];
    }) =>
      submitFaceLivenessFrames(
        tenantId as string,
        employeeId,
        challengeId,
        frames,
      ),
  });

  return {
    startChallenge: startMutation.mutateAsync,
    submitFrames: submitMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isSubmitting: submitMutation.isPending,
    reset: () => {
      startMutation.reset();
      submitMutation.reset();
    },
  };
}
