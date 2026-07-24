import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  confirmPhoneChange,
  requestEmailChange,
  requestPhoneChange,
} from '../api';
import { useAuthStore } from '../store';
import type {
  ConfirmPhoneChangeRequest,
  RequestEmailChangeRequest,
  RequestPhoneChangeRequest,
} from '../types';
import { parseAuthError } from '../utils';
import { profileKeys } from './use-profile';

export function useIdentifierChange() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const emailRequest = useMutation({
    mutationFn: (body: RequestEmailChangeRequest) => requestEmailChange(body),
  });
  const phoneRequest = useMutation({
    mutationFn: (body: RequestPhoneChangeRequest) => requestPhoneChange(body),
  });
  const phoneConfirm = useMutation({
    mutationFn: (body: ConfirmPhoneChangeRequest) => confirmPhoneChange(body, currentUser),
    onSuccess: (profile) => {
      setUser(profile);
      queryClient.setQueryData(profileKeys.me(), profile);
    },
  });

  const error = emailRequest.error ?? phoneRequest.error ?? phoneConfirm.error;
  return {
    requestEmail: emailRequest.mutateAsync,
    requestPhone: phoneRequest.mutateAsync,
    confirmPhone: phoneConfirm.mutateAsync,
    isPending: emailRequest.isPending || phoneRequest.isPending || phoneConfirm.isPending,
    error: error ? parseAuthError(error) : null,
    reset: () => {
      emailRequest.reset();
      phoneRequest.reset();
      phoneConfirm.reset();
    },
  };
}
