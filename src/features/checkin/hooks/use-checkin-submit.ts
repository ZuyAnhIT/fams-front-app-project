import * as Device from 'expo-device';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';
import { useToast } from '@/components/ui/toast';
import { useGps } from '@/features/gps/hooks/use-gps';

import { submitCheckin } from '../services/checkin.service';
import { useCheckinStore } from '../store/checkin.store';
import type { CheckinResponse } from '../types/checkin.type';
import { parseCheckinError } from '../utils/available-site';
import { checkinKeys } from './use-checkin';

export interface UseCheckinSubmitResult {
  checkIn: (siteId: string) => Promise<CheckinResponse | null>;
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
    mutationFn: (payload: { siteId: string; latitude: number; longitude: number; accuracy: number | null }) =>
      submitCheckin(tenantId!, {
        siteId: payload.siteId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        gpsAccuracy: payload.accuracy ?? undefined,
        deviceId: Device.osInternalBuildId ?? Device.modelId ?? undefined,
      }),
    onSuccess: async (result) => {
      await setOpenCheckinId(result.id);
      await queryClient.invalidateQueries({ queryKey: checkinKeys.all });
      showToast(result.message, result.status === 'valid' ? 'success' : 'info');
    },
    onError: (error) => {
      showToast(parseCheckinError(error, 'Check-in thất bại, vui lòng thử lại.'), 'error');
    },
  });

  const checkIn = async (siteId: string): Promise<CheckinResponse | null> => {
    if (!tenantId) return null;
    const coords = await requestLocation();
    if (!coords) return null;
    try {
      return await mutation.mutateAsync({
        siteId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });
    } catch {
      // `onError` already presents the backend business message. Returning
      // null keeps a rejected mutateAsync promise from reaching the press handler.
      return null;
    }
  };

  return {
    checkIn,
    isLocating,
    isSubmitting: mutation.isPending,
    locationErrorMessage,
  };
}
