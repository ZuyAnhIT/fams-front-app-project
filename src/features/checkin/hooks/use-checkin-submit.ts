import * as Device from 'expo-device';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/features/auth/store';
import { useToast } from '@/components/ui/toast';
import { useGps } from '@/features/gps/hooks/use-gps';
import { getFaceIdErrorCode } from '@/features/face/utils/face-id.utils';

import { submitCheckin } from '../services/checkin.service';
import { enqueueOfflineCheckin } from '../services/offline-checkin.service';
import { useCheckinStore } from '../store/checkin.store';
import type {
  CheckinPolicy,
  CheckinResponse,
  OpenCheckinContext,
} from '../types/checkin.type';
import { parseCheckinError } from '../utils/available-site';
import { checkinKeys } from './use-checkin';

export type CheckinFaceRequirement = 'required' | 'not_enrolled';

export interface CheckinAttempt {
  result: CheckinResponse | null;
  faceRequirement: CheckinFaceRequirement | null;
  queuedOffline: boolean;
}

export interface CheckinVerification {
  assignmentId?: string;
  siteName?: string;
  effectiveCheckinPolicy?: CheckinPolicy;
  employeePhotoBase64?: string;
  livenessChallengeId?: string;
}

export interface UseCheckinSubmitResult {
  checkIn: (
    siteId: string,
    verification?: CheckinVerification,
  ) => Promise<CheckinAttempt>;
  isLocating: boolean;
  isSubmitting: boolean;
  locationErrorMessage: string | null;
}

/** US2/US3: gửi check-in GPS. Rule "sớm/muộn" do backend quyết định qua status/invalid_reason trả về trong `message`. */
export function useCheckinSubmit(): UseCheckinSubmitResult {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const userId = useAuthStore((s) => s.user?.id);
  const { showToast } = useToast();
  const { isLocating, errorMessage: locationErrorMessage, requestLocation } = useGps();
  const setOpenCheckin = useCheckinStore((s) => s.setOpenCheckin);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: {
      siteId: string;
      latitude: number;
      longitude: number;
      accuracy: number | null;
      assignmentId?: string;
      siteName?: string;
      effectiveCheckinPolicy?: CheckinPolicy;
      employeePhotoBase64?: string;
      livenessChallengeId?: string;
    }) =>
      submitCheckin(tenantId!, {
        siteId: payload.siteId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        gpsAccuracy: payload.accuracy ?? undefined,
        deviceId: Device.osInternalBuildId ?? Device.modelId ?? undefined,
        employeePhotoBase64: payload.employeePhotoBase64,
        requiresLiveness: !!payload.livenessChallengeId,
        livenessChallengeId: payload.livenessChallengeId,
      }),
    onSuccess: async (result, payload) => {
      const context: OpenCheckinContext = {
        checkinId: result.id,
        siteId: result.siteId,
        siteName: result.siteName ?? payload.siteName ?? null,
        effectiveCheckinPolicy:
          result.effectiveCheckinPolicy ?? payload.effectiveCheckinPolicy ?? null,
      };
      await setOpenCheckin(context);
      await queryClient.invalidateQueries({ queryKey: checkinKeys.all });
      showToast(result.message, result.status === 'valid' ? 'success' : 'info');
    },
    onError: (error, payload) => {
      if (
        isAxiosError(error) &&
        !error.response &&
        userId &&
        payload.assignmentId &&
        payload.siteName &&
        payload.effectiveCheckinPolicy &&
        (payload.effectiveCheckinPolicy === 'gps_only' ||
          !!payload.employeePhotoBase64)
      ) {
        return;
      }
      const errorCode = getFaceIdErrorCode(error);
      if (errorCode === 'FACE_ID_REQUIRED' || errorCode === 'FACE_ID_NOT_ENROLLED') {
        return;
      }
      showToast(parseCheckinError(error, 'Check-in thất bại, vui lòng thử lại.'), 'error');
    },
  });

  const checkIn = async (
    siteId: string,
    verification: CheckinVerification = {},
  ): Promise<CheckinAttempt> => {
    if (!tenantId) {
      return { result: null, faceRequirement: null, queuedOffline: false };
    }
    const coords = await requestLocation();
    if (!coords) {
      return { result: null, faceRequirement: null, queuedOffline: false };
    }
    const checkinAt = new Date().toISOString();
    try {
      const result = await mutation.mutateAsync({
        siteId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        ...verification,
      });
      return { result, faceRequirement: null, queuedOffline: false };
    } catch (error) {
      if (
        isAxiosError(error) &&
        !error.response &&
        userId &&
        verification.assignmentId &&
        verification.siteName &&
        verification.effectiveCheckinPolicy &&
        (verification.effectiveCheckinPolicy === 'gps_only' ||
          !!verification.employeePhotoBase64)
      ) {
        try {
          await enqueueOfflineCheckin({
            tenantId,
            userId,
            assignmentId: verification.assignmentId,
            siteId,
            siteName: verification.siteName,
            effectiveCheckinPolicy: verification.effectiveCheckinPolicy,
            checkinAt,
            lat: coords.latitude,
            lon: coords.longitude,
            accuracy: coords.accuracy ?? undefined,
            facePhotoBase64: verification.employeePhotoBase64,
          });
          showToast(
            verification.effectiveCheckinPolicy === 'gps_face_liveness'
              ? 'Đã lưu offline kèm ảnh. Bản ghi sẽ chờ HR duyệt sau khi đồng bộ.'
              : 'Đã lưu chấm công offline và sẽ tự đồng bộ khi có mạng.',
            'info',
          );
          return { result: null, faceRequirement: null, queuedOffline: true };
        } catch {
          showToast(
            'Không thể lưu chấm công offline trên thiết bị. Vui lòng giải phóng dung lượng và thử lại.',
            'error',
          );
        }
      }
      const errorCode = getFaceIdErrorCode(error);
      if (errorCode === 'FACE_ID_REQUIRED') {
        return {
          result: null,
          faceRequirement: 'required',
          queuedOffline: false,
        };
      }
      if (errorCode === 'FACE_ID_NOT_ENROLLED') {
        return {
          result: null,
          faceRequirement: 'not_enrolled',
          queuedOffline: false,
        };
      }
      // `onError` already presents the backend business message. Returning
      // null keeps a rejected mutateAsync promise from reaching the press handler.
      return { result: null, faceRequirement: null, queuedOffline: false };
    }
  };

  return {
    checkIn,
    isLocating,
    isSubmitting: mutation.isPending,
    locationErrorMessage,
  };
}
