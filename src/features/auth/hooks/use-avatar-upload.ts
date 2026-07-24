import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteAvatarImage,
  pickAvatarImage,
  uploadAvatarImage,
} from '@/services/avatar-upload';

import { mapUserProfile } from '../api-mappers';
import { useAuthStore } from '../store';
import { parseAuthError } from '../utils';
import { profileKeys } from './use-profile';

export function useAvatarUpload() {
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const syncProfile = (raw: unknown) => {
    const profile = mapUserProfile(raw as Parameters<typeof mapUserProfile>[0], currentUser ?? undefined);
    setUser(profile);
    queryClient.setQueryData(profileKeys.me(), profile);
    return profile;
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const localUri = await pickAvatarImage();
      return uploadAvatarImage(localUri);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAvatarImage,
  });

  return {
    pickAndUploadAsync: async () => syncProfile(await uploadMutation.mutateAsync()),
    deleteAvatarAsync: async () => syncProfile(await deleteMutation.mutateAsync()),
    isPending: uploadMutation.isPending || deleteMutation.isPending,
    error: uploadMutation.isError
      ? parseAuthError(uploadMutation.error)
      : deleteMutation.isError
        ? parseAuthError(deleteMutation.error)
        : null,
    reset: () => {
      uploadMutation.reset();
      deleteMutation.reset();
    },
  };
}
