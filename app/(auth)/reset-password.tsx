import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { z } from 'zod';

import { useResetPassword } from '@/features/auth/hooks/use-reset-password';
import { useAuthTheme } from '@/features/auth/theme';

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, 'Mật khẩu ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
      .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
    confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;

// ─── Screen ───────────────────────────────────────────────────────────────────

/**
 * Reset Password screen.
 *
 * Reached via a deep-link from the reset-password email:
 *   fams://reset-password?token=<jwt>
 *
 * The `token` query-param is forwarded to the API.
 * On success the user is automatically redirected to login after 2 s.
 */
export default function ResetPasswordScreen() {
  const theme = useAuthTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { submit, isPending, isSuccess, error } = useResetPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const onSubmit = ({ new_password }: FormData) => {
    if (!token) return;
    submit({ token, new_password });
  };

  // Missing / invalid token guard
  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={theme.error} />
          <Text style={styles.errorTitle}>Liên kết không hợp lệ</Text>
          <Text style={styles.errorDesc}>
            Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng.
            Vui lòng yêu cầu lại từ màn hình quên mật khẩu.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.replace('/(auth)/forgot-password')}
          >
            <Text style={styles.primaryButtonText}>Quên mật khẩu lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>

          {/* Icon + title */}
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={36} color={theme.primary} />
          </View>
          <Text style={styles.title}>Đặt mật khẩu mới</Text>
          <Text style={styles.subtitle}>
            Nhập mật khẩu mới cho tài khoản của bạn.
          </Text>

          {/* Card */}
          <View style={styles.card}>
            {isSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.success} />
                <Text style={styles.successTitle}>Đặt lại thành công!</Text>
                <Text style={styles.successText}>
                  Đang chuyển về màn hình đăng nhập...
                </Text>
              </View>
            ) : (
              <>
                {/* New password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mật khẩu mới</Text>
                  <Controller
                    control={control}
                    name="new_password"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[
                            styles.inputFlex,
                            errors.new_password && styles.inputError,
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showNew}
                          autoCapitalize="none"
                          autoFocus
                          returnKeyType="next"
                        />
                        <TouchableOpacity
                          onPress={() => setShowNew((v) => !v)}
                          style={styles.eyeBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={showNew ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={theme.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.new_password && (
                    <Text style={styles.fieldError}>{errors.new_password.message}</Text>
                  )}
                </View>

                {/* Confirm password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                  <Controller
                    control={control}
                    name="confirm_password"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[
                            styles.inputFlex,
                            errors.confirm_password && styles.inputError,
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Nhập lại mật khẩu mới"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showConfirm}
                          autoCapitalize="none"
                          returnKeyType="done"
                          onSubmitEditing={handleSubmit(onSubmit)}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirm((v) => !v)}
                          style={styles.eyeBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={theme.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.confirm_password && (
                    <Text style={styles.fieldError}>
                      {errors.confirm_password.message}
                    </Text>
                  )}
                </View>

                {/* Password requirements hint */}
                <View style={styles.hintBox}>
                  <Text style={styles.hintTitle}>Yêu cầu mật khẩu:</Text>
                  <Text style={styles.hintItem}>• Tối thiểu 8 ký tự</Text>
                  <Text style={styles.hintItem}>• Ít nhất 1 chữ hoa (A–Z)</Text>
                  <Text style={styles.hintItem}>• Ít nhất 1 chữ số (0–9)</Text>
                </View>

                {/* API error */}
                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    isPending && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isPending}
                  activeOpacity={0.85}
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Xác nhận đặt lại</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
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
  scroll: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
  },
  passwordRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  eyeBtn: {
    paddingHorizontal: 4,
  },
  hintBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 2,
  },
  hintItem: {
    fontSize: 13,
    color: '#1E40AF',
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
  successBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
  },
  successText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
