import * as Device from 'expo-device';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';
import { useToast } from '@/components/ui/toast';
import { useGps } from '@/features/gps/hooks/use-gps';

import { getCheckinHistory, submitCheckout } from '../services/checkin.service';
import { useCheckinStore } from '../store/checkin.store';
import type { CheckinResponse } from '../types/checkin.type';
import { checkinKeys } from './use-checkin';

export interface UseCheckoutSubmitResult {
  checkOut: () => Promise<CheckinResponse | null>;
  isLocating: boolean;
  isResolvingOpenCheckin: boolean;
  isSubmitting: boolean;
  locationErrorMessage: string | null;
  openCheckinId: string | null;
}

/**
 * US4: nếu state bị mất (app kill), tìm lại check-in gần nhất chưa checkout
 * bằng GET /checkin/history (checkOutAt === null) thay vì để nhân viên bị kẹt.
 */
export function useCheckoutSubmit(): UseCheckoutSubmitResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const { showToast } = useToast();
  const { isLocating, errorMessage: locationErrorMessage, requestLocation } = useGps();
  const openCheckinId = useCheckinStore((s) => s.openCheckinId);
  const clearOpenCheckinId = useCheckinStore((s) => s.clearOpenCheckinId);
  const queryClient = useQueryClient();
  const [isResolvingOpenCheckin, setIsResolvingOpenCheckin] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: { checkinId: string; latitude: number; longitude: number; accuracy: number | null }) =>
      submitCheckout(tenantId!, payload.checkinId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        gpsAccuracy: payload.accuracy ?? undefined,
        deviceId: Device.osInternalBuildId ?? Device.modelId ?? undefined,
      }),
    onSuccess: async (result) => {
      await clearOpenCheckinId();
      await queryClient.invalidateQueries({ queryKey: checkinKeys.all });
      showToast(result.message, result.status === 'valid' ? 'success' : 'info');
    },
    onError: () => {
      showToast('Check-out thất bại, vui lòng thử lại.', 'error');
    },
  });

  const resolveOpenCheckinId = async (): Promise<string | null> => {
    if (openCheckinId) return openCheckinId;
    if (!tenantId) return null;
    setIsResolvingOpenCheckin(true);
    try {
      const history = await getCheckinHistory(tenantId, { size: 20, page: 0 });
      const openRecord = history.content.find((record) => record.checkOutAt === null);
      return openRecord?.id ?? null;
    } finally {
      setIsResolvingOpenCheckin(false);
    }
  };

  const checkOut = async (): Promise<CheckinResponse | null> => {
    if (!tenantId) return null;
    const checkinId = await resolveOpenCheckinId();
    if (!checkinId) {
      showToast('Không tìm thấy ca chấm công đang mở để check-out.', 'error');
      return null;
    }
    const coords = await requestLocation();
    if (!coords) return null;
    return mutation.mutateAsync({
      checkinId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
    });
  };

  return {
    checkOut,
    isLocating,
    isResolvingOpenCheckin,
    isSubmitting: mutation.isPending,
    locationErrorMessage,
    openCheckinId,
  };
}
