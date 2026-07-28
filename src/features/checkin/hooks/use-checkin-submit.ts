import * as Device from 'expo-device';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';
import { useToast } from '@/components/ui/toast';
import { useGps } from '@/features/gps/hooks/use-gps';
import { getFaceIdErrorCode } from '@/features/face/utils/face-id.utils';

import { submitCheckin } from '../services/checkin.service';
import { useCheckinStore } from '../store/checkin.store';
import type { CheckinResponse } from '../types/checkin.type';
import { parseCheckinError } from '../utils/available-site';
import { checkinKeys } from './use-checkin';

export type CheckinFaceRequirement = 'required' | 'not_enrolled';

export interface CheckinAttempt {
  result: CheckinResponse | null;
  faceRequirement: CheckinFaceRequirement | null;
}

export interface UseCheckinSubmitResult {
  checkIn: (siteId: string, livenessChallengeId?: string) => Promise<CheckinAttempt>;
  isLocating: boolean;
  isSubmitting: boolean;
  locationErrorMessage: string | null;
}

/** US2/US3: gửi check-in GPS. Rule "sớm/muộn" do backend quyết định qua status/invalid_reason trả về trong `message`. */
export function useCheckinSubmit(): UseCheckinSubmitResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const { showToast } = useToast();
  const { isLocating, errorMessage: locationErrorMessage, requestLocation } = useGps();
  const setOpenCheckinId = useCheckinStore((s) => s.setOpenCheckinId);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: {
      siteId: string;
      latitude: number;
      longitude: number;
      accuracy: number | null;
      livenessChallengeId?: string;
    }) =>
      submitCheckin(tenantId!, {
        siteId: payload.siteId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        gpsAccuracy: payload.accuracy ?? undefined,
        deviceId: Device.osInternalBuildId ?? Device.modelId ?? undefined,
        livenessChallengeId: payload.livenessChallengeId,
      }),
    onSuccess: async (result) => {
      await setOpenCheckinId(result.id);
      await queryClient.invalidateQueries({ queryKey: checkinKeys.all });
      showToast(result.message, result.status === 'valid' ? 'success' : 'info');
    },
    onError: (error) => {
      const errorCode = getFaceIdErrorCode(error);
      if (errorCode === 'FACE_ID_REQUIRED' || errorCode === 'FACE_ID_NOT_ENROLLED') {
        return;
      }
      showToast(parseCheckinError(error, 'Check-in thất bại, vui lòng thử lại.'), 'error');
    },
  });

  const checkIn = async (
    siteId: string,
    livenessChallengeId?: string,
  ): Promise<CheckinAttempt> => {
    if (!tenantId) return { result: null, faceRequirement: null };
    const coords = await requestLocation();
    if (!coords) return { result: null, faceRequirement: null };
    try {
      const result = await mutation.mutateAsync({
        siteId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        livenessChallengeId,
      });
      return { result, faceRequirement: null };
    } catch (error) {
      const errorCode = getFaceIdErrorCode(error);
      if (errorCode === 'FACE_ID_REQUIRED') {
        return { result: null, faceRequirement: 'required' };
      }
      if (errorCode === 'FACE_ID_NOT_ENROLLED') {
        return { result: null, faceRequirement: 'not_enrolled' };
      }
      // `onError` already presents the backend business message. Returning
      // null keeps a rejected mutateAsync promise from reaching the press handler.
      return { result: null, faceRequirement: null };
    }
  };

  return {
    checkIn,
    isLocating,
    isSubmitting: mutation.isPending,
    locationErrorMessage,
  };
}
