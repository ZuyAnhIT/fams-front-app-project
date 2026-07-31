import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { getAuthLinkToken } from '@/features/auth/deep-link';
import { navigateAfterAuth, resolveAuthenticatedSession } from '@/features/auth/session';
import { useAuthStore } from '@/features/auth/store';
import { useAuthTheme } from '@/features/auth/theme';
import { parseAuthError } from '@/features/auth/utils';
import {
  acceptInvitation,
  validateInvitation,
} from '@/features/invitation/api';
import type { InvitationType } from '@/features/invitation/types';
import { shadows } from '@/theme/tokens';

const schema = z
  .object({
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    linkExistingPhone: z.boolean(),
    existingPhone: z.string().optional(),
    existingPassword: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.linkExistingPhone) {
      if (!/^\+?[0-9]{7,15}$/.test(values.existingPhone ?? '')) {
        context.addIssue({
          code: 'custom',
          path: ['existingPhone'],
          message: 'Số điện thoại phải có 7–15 chữ số',
        });
      }
      if (!values.existingPassword) {
        context.addIssue({
          code: 'custom',
          path: ['existingPassword'],
          message: 'Vui lòng nhập mật khẩu hiện tại',
        });
      }
      return;
    }
    if (!values.password || values.password.length < 8) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Mật khẩu phải có ít nhất 8 ký tự',
      });
    }
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp',
      });
    }
  });

type FormData = z.infer<typeof schema>;

export default function AcceptInviteScreen() {
  const theme = useAuthTheme();
  const { token: rawToken, type: rawType } = useLocalSearchParams<{
    token?: string | string[];
    type?: string | string[];
  }>();
  const token = getAuthLinkToken(rawToken);
  const typeValue = Array.isArray(rawType) ? rawType[0] : rawType;
  const invitationType: InvitationType =
    typeValue === 'platform' ? 'platform' : 'tenant';
  const [showPassword, setShowPassword] = useState(false);
  const { setTokens, setUser } = useAuthStore();

  const validation = useQuery({
    queryKey: ['invitation-validation', invitationType, token],
    queryFn: () => validateInvitation(token!, invitationType),
    enabled: Boolean(token),
    retry: false,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      linkExistingPhone: false,
      existingPhone: '',
      existingPassword: '',
    },
  });
  const linkExistingPhone = watch('linkExistingPhone');
  const isExistingUser =
    validation.data?.isExistingUser ?? validation.data?.existingUser ?? false;

  const acceptance = useMutation({
    mutationFn: (values: FormData) =>
      acceptInvitation(
        {
          token: token!,
          password:
            isExistingUser || values.linkExistingPhone
              ? undefined
              : values.password,
          existingPhone: values.linkExistingPhone
            ? values.existingPhone
            : undefined,
          existingPassword: values.linkExistingPhone
            ? values.existingPassword
            : undefined,
          deviceId: `${Platform.OS}-invite`,
        },
        invitationType,
      ),
    onSuccess: async (login) => {
      await setTokens(login.access_token, login.refresh_token);
      const session = await resolveAuthenticatedSession(login.user, login.active_tenant_id);
      setUser(session.user);
      if (invitationType === 'platform' && session.tenantCandidates.length === 0) {
        router.replace('/(tabs)/profile');
      } else {
        navigateAfterAuth(session);
      }
    },
  });

  const submit = (values: FormData) => {
    if (!token) return;
    acceptance.mutate(values);
  };

  if (!token || validation.isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={54} color={theme.error} />
            <Text style={styles.title}>Lời mời không hợp lệ</Text>
            <Text style={styles.description}>
              {!token
                ? 'Đường dẫn đang thiếu token.'
                : parseAuthError(validation.error)}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Đến trang đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (validation.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.description}>Đang kiểm tra lời mời...</Text>
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
        >
          <View style={styles.card}>
            <View style={[styles.icon, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="people-outline" size={34} color={theme.primary} />
            </View>
            <Text style={styles.title}>
              {invitationType === 'platform'
                ? 'Gia nhập đội ngũ FAMS'
                : `Gia nhập ${validation.data?.tenantName ?? 'công ty'}`}
            </Text>
            <Text style={styles.email}>{validation.data?.email}</Text>
            <Text style={styles.description}>
              {isExistingUser
                ? 'Bạn đã có tài khoản. Xác nhận để tham gia ngay.'
                : 'Thiết lập thông tin đăng nhập để hoàn tất lời mời.'}
            </Text>

            {!isExistingUser &&
              invitationType === 'tenant' &&
              validation.data?.isExistingPhoneUser && (
                <View style={styles.switchRow}>
                  <View style={styles.switchText}>
                    <Text style={styles.switchTitle}>Dùng tài khoản số điện thoại</Text>
                    <Text style={styles.switchDescription}>
                      Liên kết email mời vào tài khoản hiện có
                    </Text>
                  </View>
                  <Switch
                    value={linkExistingPhone}
                    onValueChange={(value) => {
                      setValue('linkExistingPhone', value, {
                        shouldValidate: true,
                      });
                      if (value && validation.data?.phone) {
                        setValue('existingPhone', validation.data.phone);
                      }
                    }}
                    trackColor={{ true: theme.primary }}
                  />
                </View>
              )}

            {!isExistingUser && linkExistingPhone && (
              <>
                <Field
                  control={control}
                  name="existingPhone"
                  label="Số điện thoại hiện có"
                  placeholder="0912345678"
                  error={errors.existingPhone?.message}
                  keyboardType="phone-pad"
                />
                <Field
                  control={control}
                  name="existingPassword"
                  label="Mật khẩu hiện tại"
                  placeholder="Nhập mật khẩu"
                  error={errors.existingPassword?.message}
                  secureTextEntry={!showPassword}
                  onToggleSecure={() => setShowPassword((value) => !value)}
                />
              </>
            )}

            {!isExistingUser && !linkExistingPhone && (
              <>
                <Field
                  control={control}
                  name="password"
                  label="Mật khẩu mới"
                  placeholder="Tối thiểu 8 ký tự"
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  onToggleSecure={() => setShowPassword((value) => !value)}
                />
                <Field
                  control={control}
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  placeholder="Nhập lại mật khẩu"
                  error={errors.confirmPassword?.message}
                  secureTextEntry={!showPassword}
                />
              </>
            )}

            {acceptance.isError && (
              <Text style={[styles.error, { color: theme.error }]}>
                {parseAuthError(acceptance.error)}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: acceptance.isPending
                    ? theme.primaryDisabled
                    : theme.primary,
                },
              ]}
              disabled={acceptance.isPending}
              onPress={
                isExistingUser
                  ? () =>
                      acceptance.mutate({
                        linkExistingPhone: false,
                        password: '',
                        confirmPassword: '',
                        existingPhone: '',
                        existingPassword: '',
                      })
                  : handleSubmit(submit)
              }
            >
              {acceptance.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isExistingUser
                    ? 'Chấp nhận lời mời'
                    : linkExistingPhone
                      ? 'Liên kết và tham gia'
                      : 'Kích hoạt tài khoản'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FieldProps {
  control: ReturnType<typeof useForm<FormData>>['control'];
  name: 'password' | 'confirmPassword' | 'existingPhone' | 'existingPassword';
  label: string;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  onToggleSecure?: () => void;
}

function Field({
  control,
  name,
  label,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = 'default',
  onToggleSecure,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <View style={[styles.inputRow, error && styles.inputError]}>
            <TextInput
              style={styles.input}
              value={typeof value === 'string' ? value : ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry}
            />
            {onToggleSecure && (
              <TouchableOpacity onPress={onToggleSecure} style={styles.eye}>
                <Ionicons
                  name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 24,
    gap: 16,
    ...shadows.card,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { color: '#0F172A', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  email: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
  },
  description: { color: '#64748B', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 12,
  },
  switchText: { flex: 1 },
  switchTitle: { color: '#1E3A8A', fontSize: 14, fontWeight: '700' },
  switchDescription: { color: '#475569', fontSize: 12, marginTop: 3 },
  field: { gap: 7 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  inputRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 14, color: '#0F172A' },
  eye: { padding: 12 },
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#DC2626', fontSize: 12 },
  error: { textAlign: 'center', fontSize: 13, lineHeight: 19 },
  button: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
