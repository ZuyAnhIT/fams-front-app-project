import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/features/auth/store';
import { useToast } from '@/components/ui/toast';
import { useGps } from '@/features/gps/hooks/use-gps';
import { getFaceIdErrorCode } from '@/features/face/utils/face-id.utils';

import { getCheckinHistory, submitCheckout } from '../services/checkin.service';
import { useCheckinStore } from '../store/checkin.store';
import type { CheckinResponse, OpenCheckinContext } from '../types/checkin.type';
import { parseCheckinError } from '../utils/available-site';
import { checkinKeys } from './use-checkin';

export interface UseCheckoutSubmitResult {
  checkOut: (verification?: CheckoutVerification) => Promise<CheckoutAttempt>;
  isLocating: boolean;
  isResolvingOpenCheckin: boolean;
  isSubmitting: boolean;
  locationErrorMessage: string | null;
  openCheckinId: string | null;
  openCheckin: OpenCheckinContext | null;
}

export interface CheckoutVerification {
  employeePhotoBase64?: string;
  livenessChallengeId?: string;
}

export interface CheckoutAttempt {
  result: CheckinResponse | null;
  faceRequirement: 'required' | 'not_enrolled' | null;
  alreadyCompleted: boolean;
}

function isAlreadyCheckedOut(error: unknown): boolean {
  if (!isAxiosError(error) || error.response?.status !== 409) return false;
  const body = error.response.data as { message?: string } | undefined;
  return body?.message?.toLowerCase().includes('already checked out') ?? false;
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
  const openCheckin = useCheckinStore((s) => s.openCheckin);
  const isHydratingCheckin = useCheckinStore((s) => s.isHydrating);
  const setOpenCheckin = useCheckinStore((s) => s.setOpenCheckin);
  const clearOpenCheckinId = useCheckinStore((s) => s.clearOpenCheckinId);
  const queryClient = useQueryClient();
  const [isResolvingOpenCheckin, setIsResolvingOpenCheckin] = useState(false);

  // Reconcile local state with the backend as soon as the screen opens. This
  // prevents a stale/missing local key from enabling a second check-in while a
  // server-side shift is still open.
  useEffect(() => {
    if (!tenantId || isHydratingCheckin || openCheckinId) return;

    let cancelled = false;
    setIsResolvingOpenCheckin(true);
    void getCheckinHistory(tenantId, { size: 20, page: 0 })
      .then(async (history) => {
        const openRecord = history.content.find((record) => record.checkOutAt === null);
        if (!cancelled && openRecord) {
          await setOpenCheckin({
            checkinId: openRecord.id,
            siteId: openRecord.siteId,
            siteName: openRecord.siteName,
            effectiveCheckinPolicy: openRecord.effectiveCheckinPolicy,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsResolvingOpenCheckin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isHydratingCheckin, openCheckinId, setOpenCheckin, tenantId]);

  const mutation = useMutation({
    mutationFn: (payload: {
      checkinId: string;
      latitude: number;
      longitude: number;
      accuracy: number | null;
      employeePhotoBase64?: string;
      livenessChallengeId?: string;
    }) =>
      submitCheckout(tenantId!, payload.checkinId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        gpsAccuracy: payload.accuracy ?? undefined,
        deviceId: Device.osInternalBuildId ?? Device.modelId ?? undefined,
        employeePhotoBase64: payload.employeePhotoBase64,
        // See use-checkin-submit.ts — same fix: request passive liveness on plain-photo
        // submissions too, not just when an active challenge was completed.
        requiresLiveness: !!(payload.livenessChallengeId || payload.employeePhotoBase64),
        livenessChallengeId: payload.livenessChallengeId,
      }),
    onSuccess: async (result) => {
      await clearOpenCheckinId();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: checkinKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['attendance'] }),
      ]);
      showToast(result.message, result.status === 'valid' ? 'success' : 'info');
    },
    onError: (error) => {
      if (isAlreadyCheckedOut(error)) return;
      const errorCode = getFaceIdErrorCode(error);
      if (errorCode === 'FACE_ID_REQUIRED' || errorCode === 'FACE_ID_NOT_ENROLLED') {
        return;
      }
      showToast(parseCheckinError(error, 'Check-out thất bại, vui lòng thử lại.'), 'error');
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

  const checkOut = async (
    verification: CheckoutVerification = {},
  ): Promise<CheckoutAttempt> => {
    if (!tenantId) {
      return { result: null, faceRequirement: null, alreadyCompleted: false };
    }
    const checkinId = await resolveOpenCheckinId();
    if (!checkinId) {
      showToast('Không tìm thấy ca chấm công đang mở để check-out.', 'error');
      return { result: null, faceRequirement: null, alreadyCompleted: false };
    }
    const coords = await requestLocation();
    if (!coords) {
      return { result: null, faceRequirement: null, alreadyCompleted: false };
    }
    try {
      const result = await mutation.mutateAsync({
        checkinId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        ...verification,
      });
      return { result, faceRequirement: null, alreadyCompleted: false };
    } catch (error) {
      if (isAlreadyCheckedOut(error)) {
        await clearOpenCheckinId();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: checkinKeys.all }),
          queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        ]);
        showToast('Lượt chấm công đã được check-out. Đã làm mới trạng thái.', 'info');
        return { result: null, faceRequirement: null, alreadyCompleted: true };
      }
      const errorCode = getFaceIdErrorCode(error);
      if (errorCode === 'FACE_ID_REQUIRED') {
        return { result: null, faceRequirement: 'required', alreadyCompleted: false };
      }
      if (errorCode === 'FACE_ID_NOT_ENROLLED') {
        return { result: null, faceRequirement: 'not_enrolled', alreadyCompleted: false };
      }
      // `onError` already shows the actionable server message.
      return { result: null, faceRequirement: null, alreadyCompleted: false };
    }
  };

  return {
    checkOut,
    isLocating,
    isResolvingOpenCheckin,
    isSubmitting: mutation.isPending,
    locationErrorMessage,
    openCheckinId,
    openCheckin,
  };
}
