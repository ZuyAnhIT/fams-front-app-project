import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OTPInput } from '@/features/auth/components/OTPInput';
import { use2FAVerify } from '@/features/auth/hooks/use-2fa';
import { useAuthTheme } from '@/features/auth/theme';

/**
 * 2FA verification screen – shown after email/phone login
 * when the server requires a TOTP confirmation.
 *
 * The temp_token is read from authStore inside use2FAVerify.
 */
export default function TwoFAVerifyScreen() {
  const theme = useAuthTheme();
  const [code, setCode] = useState('');
  const { verify, isPending, error } = use2FAVerify();

  const handleSubmit = () => {
    if (code.length === 6) verify(code);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={36} color={theme.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Xác thực 2 lớp</Text>
          <Text style={styles.subtitle}>
            Nhập mã 6 chữ số từ ứng dụng{'\n'}xác thực của bạn
          </Text>

          {/* Card */}
          <View style={styles.card}>
            <OTPInput
              value={code}
              onChange={setCode}
              hasError={!!error}
              autoFocus
            />

            {/* Error message */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Help text */}
            <Text style={styles.helpText}>
              Mở ứng dụng Google Authenticator, Authy hoặc ứng dụng tương tự
              để lấy mã.
            </Text>

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: theme.primary },
                (isPending || code.length < 6) && { backgroundColor: theme.primaryDisabled },
              ]}
              onPress={handleSubmit}
              disabled={isPending || code.length < 6}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Xác nhận</Text>
              )}
            </TouchableOpacity>

            {/* Backup code hint */}
            <Text style={styles.backupHint}>
              Mất điện thoại?{' '}
              <Text style={styles.backupHintAccent}>Dùng mã dự phòng</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    position: 'absolute',
    top: 0,
    left: 24,
  },
  backBtnText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '500',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  backupHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  backupHintAccent: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
