import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
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
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface LoginFormProps {
  /** Called when the user taps the phone-login tab */
  onSwitchToPhone?: () => void;
}

export function LoginForm({ onSwitchToPhone }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const theme = useAuthTheme();
  const { login, isPending, error, lockedUntil } = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginFormData) => login(data);

  return (
    <View style={styles.container}>
      {/* Email input */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="nguyen.van.a@company.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          )}
        />
        {errors.email && (
          <Text style={styles.fieldError}>{errors.email.message}</Text>
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
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
      {error && lockedUntil ? (
        <AccountLockedBanner lockedUntil={lockedUntil} message={error} />
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

      {/* Switch to phone login */}
      <TouchableOpacity onPress={onSwitchToPhone} style={styles.switchButton}>
        <Text style={[styles.switchText, { color: theme.textSecondary }]}>
          Đăng nhập bằng{' '}
          <Text style={[styles.linkText, { color: theme.primary }]}>số điện thoại</Text>
        </Text>
      </TouchableOpacity>

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
  switchButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 14,
    color: '#64748B',
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
