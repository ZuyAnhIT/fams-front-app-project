import { useMutation } from '@tanstack/react-query';

import { pickAvatarImage, uploadAvatarImage } from '@/services/avatar-upload';

import { parseAuthError } from '../utils/auth.utils';

export function useAvatarUpload() {
  const mutation = useMutation({
    mutationFn: async () => {
      const localUri = await pickAvatarImage();
      return uploadAvatarImage(localUri);
    },
  });

  return {
    pickAndUpload: mutation.mutate,
    pickAndUploadAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    reset: mutation.reset,
  };
}
