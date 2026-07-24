import { useRef, useState } from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { isExpoGo } from '../runtime';

async function getFirebaseAuth() {
  if (isExpoGo()) {
    throw new Error(
      'Expo Go không hỗ trợ Firebase Phone Auth. Hãy mở bằng FAMS Development Build.',
    );
  }

  const { default: auth } = await import('@react-native-firebase/auth');
  return auth();
}

/**
 * Drives the client-side half of Firebase Phone Auth (send SMS code, confirm
 * it, hand back an ID token) for backlog #2 (Đăng nhập bằng số điện thoại OTP).
 * No reCAPTCHA step here (unlike the web equivalent) — react-native-firebase
 * handles device attestation natively (Play Integrity / APNs silent push).
 */
export function useFirebasePhoneAuth() {
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  /** Sends the SMS code. `phoneE164` must already be in +84... format. */
  async function sendCode(phoneE164: string): Promise<void> {
    setIsSending(true);
    try {
      const auth = await getFirebaseAuth();
      confirmationRef.current = await auth.signInWithPhoneNumber(phoneE164);
    } finally {
      setIsSending(false);
    }
  }

  /** Confirms the 6-digit code and returns a Firebase ID token for the backend. */
  async function confirmCode(code: string): Promise<string> {
    if (!confirmationRef.current) {
      throw new Error('Chưa gửi mã OTP — vui lòng gửi lại.');
    }
    setIsConfirming(true);
    try {
      const credential = await confirmationRef.current.confirm(code);
      if (!credential?.user) {
        throw new Error('Xác thực OTP thất bại.');
      }
      return await credential.user.getIdToken();
    } finally {
      setIsConfirming(false);
    }
  }

  function reset() {
    confirmationRef.current = null;
  }

  return { sendCode, confirmCode, reset, isSending, isConfirming };
}
