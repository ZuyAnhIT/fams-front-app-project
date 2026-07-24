import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { registerUser, sendRegistrationOTP } from '../api';
import type { RegisterRequest, SendRegistrationOTPRequest } from '../types';
import { parseAuthError } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseRegisterResult {
  register: (data: RegisterRequest) => void;
  sendPhoneOTP: (data: SendRegistrationOTPRequest) => Promise<void>;
  isPending: boolean;
  isSendingOTP: boolean;
  error: string | null;
  otpError: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Handles new account registration.
 *
 * Registration never returns auth tokens. Email registrations move to the
 * verification waiting screen; phone registrations move back to password login.
 */
export function useRegister(): UseRegisterResult {
  const { showToast } = useToast();

  const otpMutation = useMutation({
    mutationFn: (body: SendRegistrationOTPRequest) => sendRegistrationOTP(body),
  });

  const mutation = useMutation({
    mutationFn: (body: RegisterRequest) => registerUser(body),
    onSuccess: (data, variables) => {
      showToast(data.message, 'success');
      if ('email' in variables && data.email_verification_required) {
        router.replace({
          pathname: '/(auth)/email-verification' as never,
          params: { email: variables.email },
        });
        return;
      }
      const identifier = 'phone' in variables ? variables.phone : variables.email;
      router.replace({
        pathname: '/(auth)/login' as never,
        params: { identifier },
      });
    },
  });

  return {
    register: mutation.mutate,
    sendPhoneOTP: otpMutation.mutateAsync,
    isPending: mutation.isPending,
    isSendingOTP: otpMutation.isPending,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    otpError: otpMutation.isError ? parseAuthError(otpMutation.error) : null,
  };
}
