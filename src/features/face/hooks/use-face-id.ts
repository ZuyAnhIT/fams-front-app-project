import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store';

import { enrollFaceId, getFaceIdStatus, revokeFaceId, saveFaceIdConsent } from '../services/face.service';
import type { FaceIdStatusDto, FaceImagePayload } from '../types/FaceId';
import { parseFaceIdError } from '../utils/face-id.utils';

export const faceIdKeys = {
  status: (tenantId: string, employeeId: string) =>
    ['face-id', 'status', tenantId, employeeId] as const,
};

export function useFaceIdStatus(employeeId: string | null) {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: faceIdKeys.status(tenantId ?? '', employeeId ?? ''),
    queryFn: () => getFaceIdStatus(tenantId as string, employeeId as string),
    enabled: !!tenantId && !!employeeId,
    staleTime: 60 * 1000,
  });

  return {
    faceIdStatus: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useFaceIdConsent(employeeId: string | null) {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () => saveFaceIdConsent(tenantId as string, employeeId as string),
    onSuccess: (data: FaceIdStatusDto) => {
      if (tenantId && employeeId) {
        // Mutation response đã là FaceIdStatusDto mới nhất — ghi thẳng vào cache
        // thay vì chỉ invalidate, để UI cập nhật ngay không phụ thuộc refetch nền.
        queryClient.setQueryData(faceIdKeys.status(tenantId, employeeId), data);
      }
      showToast('Đã ghi nhận đồng ý Face ID', 'success');
    },
    onError: (error) => {
      showToast(parseFaceIdError(error), 'error');
    },
  });

  return {
    saveConsent: mutation.mutate,
    saveConsentAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

export function useFaceIdEnroll(employeeId: string | null) {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (images: FaceImagePayload[]) =>
      enrollFaceId(tenantId as string, employeeId as string, images),
    onSuccess: (data: FaceIdStatusDto) => {
      if (tenantId && employeeId) {
        // Mutation response đã là FaceIdStatusDto mới nhất (status: "enrolled") —
        // ghi thẳng vào cache thay vì chỉ invalidate, để UI cập nhật ngay.
        queryClient.setQueryData(faceIdKeys.status(tenantId, employeeId), data);
      }
      showToast('Đăng ký Face ID thành công', 'success');
    },
    onError: (error) => {
      showToast(parseFaceIdError(error), 'error');
    },
  });

  return {
    enroll: mutation.mutate,
    enrollAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

export function useFaceIdRevoke(employeeId: string | null) {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () => revokeFaceId(tenantId as string, employeeId as string),
    onSuccess: (data: FaceIdStatusDto) => {
      if (tenantId && employeeId) {
        queryClient.setQueryData(faceIdKeys.status(tenantId, employeeId), data);
      }
      showToast('Đã thu hồi Face ID', 'success');
    },
    onError: (error) => {
      showToast(parseFaceIdError(error), 'error');
    },
  });

  return {
    revoke: mutation.mutate,
    isPending: mutation.isPending,
  };
}
