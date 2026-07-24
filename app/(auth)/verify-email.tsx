import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmEmailChange, getMyProfile, verifyEmailToken } from '@/features/auth/api';
import { getAuthLinkToken } from '@/features/auth/deep-link';
import { profileKeys } from '@/features/auth/hooks/use-profile';
import { canOpenMobileLogin, navigateToLogin } from '@/features/auth/navigation';
import { useAuthStore } from '@/features/auth/store';
import { useAuthTheme } from '@/features/auth/theme';
import { parseAuthError } from '@/features/auth/utils';
import { shadows } from '@/theme/tokens';

export default function VerifyEmailScreen() {
  const { token: rawToken, purpose: rawPurpose, mode: rawMode } = useLocalSearchParams<{
    token?: string | string[];
    purpose?: string | string[];
    mode?: string | string[];
  }>();
  const token = getAuthLinkToken(rawToken);
  const purpose = Array.isArray(rawPurpose) ? rawPurpose[0] : rawPurpose;
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  const isProfileEmailChange = purpose === 'profile-email-change' || mode === 'email-change';
  const attemptedTokenRef = useRef<string | null>(null);
  const theme = useAuthTheme();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const opensMobileApp = canOpenMobileLogin();
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const verification = useMutation({
    mutationFn: async (value: string) => {
      if (isProfileEmailChange) return confirmEmailChange(value);
      try {
        return await verifyEmailToken(value);
      } catch (registrationError) {
        // Older backend templates did not add a purpose query parameter. Token
        // namespaces are independent, so try the profile-email endpoint safely
        // only when the first endpoint really rejected the token. A network/server
        // failure must be shown immediately instead of issuing another slow request.
        if (!isAxiosError(registrationError) || registrationError.response?.status !== 400) {
          throw registrationError;
        }
        try {
          await confirmEmailChange(value);
        } catch {
          throw registrationError;
        }
      }
    },
    onSuccess: async () => {
      if (!useAuthStore.getState().isAuthenticated) return;
      const profile = await getMyProfile(useAuthStore.getState().user);
      useAuthStore.getState().setUser(profile);
      queryClient.setQueryData(profileKeys.me(), profile);
    },
  });

  useEffect(() => {
    if (isHydrating || !token || attemptedTokenRef.current === token) return;
    attemptedTokenRef.current = token;
    verification.mutate(token);
    // A verification token is one-time use, so guard React development
    // effect replays from accidentally issuing the GET request twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrating, token]);

  const missingToken = !token;
  const retry = () => {
    if (!token) return;
    attemptedTokenRef.current = token;
    verification.reset();
    verification.mutate(token);
  };

  const navigateAway = () => {
    if (isAuthenticated && !opensMobileApp) {
      router.replace('/(tabs)/profile');
      return;
    }
    navigateToLogin();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          {verification.isPending && <ActivityIndicator size="large" color={theme.primary} />}
          <Text style={styles.title}>
            {verification.isPending
              ? 'Đang xác thực email...'
              : verification.isSuccess
                ? 'Xác thực thành công'
                : 'Không thể xác thực email'}
          </Text>
          <Text style={styles.message}>
            {verification.isSuccess
              ? isAuthenticated
                ? 'Email đã được xác nhận và hồ sơ của bạn đã được cập nhật.'
                : 'Bạn có thể đăng nhập bằng email và mật khẩu ngay bây giờ.'
              : missingToken
                ? 'Liên kết xác thực đang thiếu token.'
                : verification.isError
                  ? parseAuthError(verification.error)
                  : 'Vui lòng chờ trong giây lát.'}
          </Text>
          {!verification.isPending && verification.isError && !missingToken && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={retry}
            >
              <Text style={styles.buttonText}>Thử lại</Text>
            </TouchableOpacity>
          )}
          {!verification.isPending && (
            <TouchableOpacity
              style={[
                styles.button,
                verification.isError && styles.secondaryButton,
                !verification.isError && { backgroundColor: theme.primary },
              ]}
              onPress={navigateAway}
            >
              <Text style={verification.isError ? styles.secondaryButtonText : styles.buttonText}>
                {opensMobileApp ? 'Mở ứng dụng FAMS' : isAuthenticated ? 'Về hồ sơ' : 'Đến trang đăng nhập'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  card: { alignItems: 'center', gap: 18, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, ...shadows.card },
  title: { color: '#1E293B', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  message: { color: '#64748B', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  button: { width: '100%', minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  secondaryButtonText: { color: '#475569', fontSize: 15, fontWeight: '700' },
});
