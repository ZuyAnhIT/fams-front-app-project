import { zodResolver } from '@hookform/resolvers/zod';
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

import { useRegister } from '../hooks/use-register';

// ─── Validation Schema ────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Họ tên ít nhất 2 ký tự').max(100, 'Họ tên quá dài'),
    email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
    phone: z
      .string()
      .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Mật khẩu ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
      .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
    confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Registration form with full validation.
 * Calls useRegister which handles navigation on success.
 */
export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, isPending, error } = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = ({ full_name, email, phone, password }: RegisterFormData) =>
    register({ full_name, email, phone: phone || undefined, password });

  return (
    <View style={styles.container}>
      {/* Full name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Họ và tên</Text>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.full_name && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
        />
        {errors.full_name && (
          <Text style={styles.fieldError}>{errors.full_name.message}</Text>
        )}
      </View>

      {/* Email */}
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
              returnKeyType="next"
            />
          )}
        />
        {errors.email && (
          <Text style={styles.fieldError}>{errors.email.message}</Text>
        )}
      </View>

      {/* Phone (optional) */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>
          Số điện thoại{' '}
          <Text style={styles.optional}>(không bắt buộc)</Text>
        </Text>
        <Controller
          control={control}
          name="phone"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="0901234567"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          )}
        />
        {errors.phone && (
          <Text style={styles.fieldError}>{errors.phone.message}</Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Mật khẩu</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.inputFlex, errors.password && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.password && (
          <Text style={styles.fieldError}>{errors.password.message}</Text>
        )}
      </View>

      {/* Confirm password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <Controller
          control={control}
          name="confirm_password"
          render={({ field: { value, onChange, onBlur } }) => (
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.inputFlex, errors.confirm_password && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Nhập lại mật khẩu"
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
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.confirm_password && (
          <Text style={styles.fieldError}>{errors.confirm_password.message}</Text>
        )}
      </View>

      {/* API error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.primaryButton, isPending && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        activeOpacity={0.85}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Tạo tài khoản</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  optional: {
    fontWeight: '400',
    color: '#94A3B8',
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
  eyeIcon: {
    fontSize: 18,
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
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93B4F8',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
