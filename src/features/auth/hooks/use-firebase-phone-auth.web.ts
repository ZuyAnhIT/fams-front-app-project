import { useState } from 'react';

/**
 * Web stub — `@react-native-firebase/auth` has no web bundle and its import
 * chain breaks the entire Expo Web build app-wide (every route, via
 * expo-router's eager `require.context`) if this file doesn't exist, exactly
 * like `react-native-maps` did for SiteDetail.tsx. Phone login isn't expected
 * to work on the Expo Web target anyway (no native Play Integrity/APNs
 * attestation there) — native iOS/Android via the EAS dev-client is the real
 * target for backlog #2.
 */
export function useFirebasePhoneAuth() {
  const [isSending] = useState(false);
  const [isConfirming] = useState(false);

  async function sendCode(): Promise<void> {
    throw new Error('Đăng nhập bằng số điện thoại chỉ hỗ trợ trên ứng dụng di động.');
  }

  async function confirmCode(): Promise<string> {
    throw new Error('Đăng nhập bằng số điện thoại chỉ hỗ trợ trên ứng dụng di động.');
  }

  function reset() {}

  return { sendCode, confirmCode, reset, isSending, isConfirming };
}
