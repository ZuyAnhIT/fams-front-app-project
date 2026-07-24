import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OTPInput } from '@/features/auth/components/OTPInput';
import { use2FAVerify } from '@/features/auth/hooks/use-2fa';
import { useAuthTheme } from '@/features/auth/theme';
import { shadows } from '@/theme/tokens';

/**
 * 2FA verification screen – shown after email/phone login
 * when the server requires a TOTP confirmation.
 *
 * The temp_token is read from authStore inside use2FAVerify.
 */
export default function TwoFAVerifyScreen() {
  const theme = useAuthTheme();
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'totp' | 'backup'>('totp');
  const [backupCode, setBackupCode] = useState('');
  const { verify, isPending, error } = use2FAVerify();

  const handleSubmit = () => {
    if (method === 'totp' && code.length === 6) verify({ code });
    if (method === 'backup' && backupCode.trim()) verify({ backup_code: backupCode.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            Nhập mã từ ứng dụng xác thực hoặc dùng mã dự phòng
          </Text>

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodButton, method === 'totp' && { backgroundColor: theme.primary }]}
                onPress={() => setMethod('totp')}
              >
                <Text style={[styles.methodText, method === 'totp' && styles.methodTextActive]}>Mã TOTP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodButton, method === 'backup' && { backgroundColor: theme.primary }]}
                onPress={() => setMethod('backup')}
              >
                <Text style={[styles.methodText, method === 'backup' && styles.methodTextActive]}>Mã dự phòng</Text>
              </TouchableOpacity>
            </View>

            {method === 'totp' ? (
              <OTPInput value={code} onChange={setCode} hasError={!!error} autoFocus />
            ) : (
              <TextInput
                value={backupCode}
                onChangeText={setBackupCode}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Nhập mã dự phòng"
                placeholderTextColor="#94A3B8"
                style={styles.backupInput}
              />
            )}

            {/* Error message */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Help text */}
            <Text style={styles.helpText}>
              {method === 'totp'
                ? 'Mở Google Authenticator, Authy hoặc ứng dụng tương tự để lấy mã.'
                : 'Mỗi mã dự phòng chỉ có thể sử dụng một lần.'}
            </Text>

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: theme.primary },
                (isPending || (method === 'totp' ? code.length < 6 : !backupCode.trim())) && { backgroundColor: theme.primaryDisabled },
              ]}
              onPress={handleSubmit}
              disabled={isPending || (method === 'totp' ? code.length < 6 : !backupCode.trim())}
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
              Không truy cập được ứng dụng xác thực? Dùng một mã dự phòng đã lưu khi bật 2FA.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
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
    ...shadows.card,
  },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodButton: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F1F5F9' },
  methodText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  methodTextActive: { color: '#FFFFFF' },
  backupInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#1E293B' },
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
});
