import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';

import { useLogin } from '../hooks/use-login';
import { AccountLockedBanner } from './AccountLockedBanner';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useAuthTheme } from '../theme';

// ─── Validation Schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email hoặc số điện thoại')
    .refine((value) => {
      if (value.includes('@')) return z.string().email().safeParse(value).success;
      return /^\+?[0-9]{8,15}$/.test(value.replace(/[\s().-]/g, ''));
    }, 'Email hoặc số điện thoại không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const params = useLocalSearchParams<{ identifier?: string }>();
  const theme = useAuthTheme();
  const {
    login,
    clearError,
    isPending,
    error,
    isAccountLocked,
    lockedUntil,
    emailVerificationRequired,
  } = useLogin();

  const {
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: params.identifier ?? '', password: '' },
  });

  const onSubmit = (data: LoginFormData) => login(data);
  const openAccountUnlock = () => {
    const identifier = getValues('identifier').trim();
    router.push({
      pathname: '/(auth)/forgot-password' as never,
      params: {
        reason: 'account-locked',
        ...(identifier.includes('@')
          ? { email: identifier.toLowerCase() }
          : {}),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Email / phone identifier */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email hoặc số điện thoại</Text>
        <Controller
          control={control}
          name="identifier"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.identifier && styles.inputError]}
              value={value}
              onChangeText={(nextValue) => {
                clearError();
                onChange(nextValue);
              }}
              onBlur={onBlur}
              placeholder="email@company.com hoặc 0912345678"
              placeholderTextColor="#94A3B8"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="Email hoặc số điện thoại"
            />
          )}
        />
        {errors.identifier && (
          <Text style={styles.fieldError}>{errors.identifier.message}</Text>
        )}
      </View>

      {/* Password input */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.passwordWrapper}>
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                value={value}
                onChangeText={(nextValue) => {
                  clearError();
                  onChange(nextValue);
                }}
                onBlur={onBlur}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                accessibilityLabel="Mật khẩu"
              />
            )}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={styles.fieldError}>{errors.password.message}</Text>
        )}
      </View>

      {/* Forgot password link */}
      <TouchableOpacity
        onPress={() => router.push('/(auth)/forgot-password' as never)}
        style={styles.forgotButton}
      >
        <Text style={[styles.linkText, { color: theme.primary }]}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      {/* API error banner */}
      {error && isAccountLocked ? (
        <AccountLockedBanner
          lockedUntil={lockedUntil}
          message={error}
          onResetPassword={openAccountUnlock}
        />
      ) : error ? (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
          ]}
        >
          <Text style={[styles.errorBannerText, { color: theme.error }]}>{error}</Text>
        </View>
      ) : null}

      {emailVerificationRequired && (
        <TouchableOpacity
          style={styles.verifyEmailButton}
          onPress={() => router.push({
            pathname: '/(auth)/email-verification' as never,
            params: { email: getValues('identifier') },
          })}
        >
          <Text style={[styles.verifyEmailText, { color: theme.primary }]}>Gửi lại email xác thực</Text>
        </TouchableOpacity>
      )}

      {/* Submit button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: theme.primary },
          isPending && { backgroundColor: theme.primaryDisabled },
        ]}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        activeOpacity={0.85}
      >
        {isPending ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.submitText}>Đăng nhập</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>HOẶC</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>

      <GoogleSignInButton disabled={isPending} />

      <View style={styles.RegisterRow}>
        <Text style={[styles.RegisterText, { color: theme.textSecondary }]}>
          Chưa có tài khoản?{' '}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
          <Text style={[styles.linkText, { color: theme.primary }]}>Đăng ký</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  input: {
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
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    paddingRight: 48,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eyeText: {
    fontSize: 18,
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  verifyEmailButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  verifyEmailText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  RegisterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  RegisterText: {
    fontSize: 14,
    color: '#64748B',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
