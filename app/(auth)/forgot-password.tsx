import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
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

import { useForgotPassword } from '@/features/auth/hooks/use-forgot-password';
import { useAuthTheme } from '@/features/auth/theme';
import { shadows } from '@/theme/tokens';

const schema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
});

type FormData = z.infer<typeof schema>;

/**
 * Forgot Password – Sprint 1 skeleton.
 * Full OTP reset flow will be added in Sprint 2.
 */
export default function ForgotPasswordScreen() {
  const theme = useAuthTheme();
  const { submit, isPending, isSuccess, error } = useForgotPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = ({ email }: FormData) => submit({ email });

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Quên mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu.
          </Text>

          <View style={styles.card}>
            {isSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="mail-open-outline" size={48} color={theme.primary} />
                <Text style={styles.successTitle}>Đã gửi email!</Text>
                <Text style={styles.successText}>
                  Kiểm tra hộp thư và làm theo hướng dẫn để đặt lại mật khẩu.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  onPress={() => router.back()}
                >
                  <Text style={styles.primaryButtonText}>Quay lại đăng nhập</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
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
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit(onSubmit)}
                        accessibilityLabel="Email"
                      />
                    )}
                  />
                  {errors.email && (
                    <Text style={styles.fieldError}>{errors.email.message}</Text>
                  )}
                </View>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    isPending && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Gửi link đặt lại</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  backBtnText: { fontSize: 15, color: '#2563EB', fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', lineHeight: 22 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    ...shadows.card,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
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
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12, color: '#EF4444' },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { fontSize: 13, color: '#DC2626' },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', gap: 12 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#16A34A' },
  successText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
