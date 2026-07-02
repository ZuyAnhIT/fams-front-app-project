import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';

import { deleteFace, getFaceStatus, registerFace, saveConsent } from '../services/face.service';
import type { FaceImagePayload, FaceStatusResponse, SaveConsentRequest } from '../types/Profile';
import { parseProfileError } from '../utils/profile.utils';

export const faceKeys = {
  status: () => ['profile', 'face', 'status'] as const,
};

export function useFaceStatus() {
  const query = useQuery({
    queryKey: faceKeys.status(),
    queryFn: getFaceStatus,
    staleTime: 60 * 1000,
  });

  return {
    faceStatus: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useFaceConsent() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (body: SaveConsentRequest) => saveConsent(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faceKeys.status() });
      showToast('Đã ghi nhận đồng ý Face ID', 'success');
    },
    onError: (error) => {
      showToast(parseProfileError(error), 'error');
    },
  });

  return {
    saveConsent: mutation.mutate,
    saveConsentAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

export function useFaceRegister() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (images: FaceImagePayload[]) => registerFace(images),
    onSuccess: (data) => {
      queryClient.setQueryData<FaceStatusResponse>(faceKeys.status(), (prev) => ({
        ...(prev ?? {
          status: 'registered',
          consent_given: true,
          photo_count: 0,
        }),
        status: 'registered',
        consent_given: true,
        registered_at: data.registered_at,
        photo_count: data.photo_count,
        quality_score: data.quality_score,
        last_updated_at: data.registered_at,
      }));
      showToast('Đăng ký Face ID thành công', 'success');
    },
    onError: (error) => {
      showToast(parseProfileError(error), 'error');
    },
  });

  return {
    register: mutation.mutate,
    registerAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
  };
}

export function useFaceDelete() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: deleteFace,
    onSuccess: (data) => {
      queryClient.setQueryData<FaceStatusResponse>(faceKeys.status(), {
        status: data.status,
        consent_given: false,
        photo_count: 0,
        last_updated_at: data.deleted_at,
      });
      showToast('Đã thu hồi Face ID', 'success');
    },
    onError: (error) => {
      showToast(parseProfileError(error), 'error');
    },
  });

  return {
    deleteFace: mutation.mutate,
    isPending: mutation.isPending,
  };
}
