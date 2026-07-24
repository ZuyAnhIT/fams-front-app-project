import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resendVerificationEmail } from '@/features/auth/api';
import { useAuthTheme } from '@/features/auth/theme';
import { parseAuthError } from '@/features/auth/utils';
import { shadows } from '@/theme/tokens';

const NEUTRAL_RESEND_MESSAGE =
  'Nếu tài khoản hợp lệ và chưa xác thực, một email mới đã được gửi.';

export default function EmailVerificationScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const theme = useAuthTheme();
  const resend = useMutation({
    mutationFn: () => resendVerificationEmail({ email }),
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread-outline" size={40} color={theme.primary} />
          </View>
          <Text style={styles.title}>Kiểm tra email của bạn</Text>
          <Text style={styles.description}>
            Chúng tôi đã gửi liên kết xác thực đến{email ? ` ${email}` : ' email bạn đăng ký'}.
            Liên kết có hiệu lực trong 24 giờ.
          </Text>

          {resend.isSuccess && <Text style={styles.success}>{NEUTRAL_RESEND_MESSAGE}</Text>}
          {resend.isError && <Text style={styles.error}>{parseAuthError(resend.error)}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => void Linking.openURL('mailto:')}
          >
            <Text style={styles.primaryText}>Mở ứng dụng email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => resend.mutate()}
            disabled={!email || resend.isPending}
          >
            <Text style={[styles.secondaryText, { color: theme.primary }]}>
              {resend.isPending ? 'Đang gửi...' : 'Gửi lại email xác thực'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace({
              pathname: '/(auth)/login' as never,
              params: { identifier: email },
            })}
          >
            <Text style={styles.loginText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  card: { alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, ...shadows.card },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' },
  title: { color: '#1E293B', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  description: { color: '#64748B', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  success: { color: '#15803D', backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, width: '100%', textAlign: 'center' },
  error: { color: '#DC2626', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, width: '100%', textAlign: 'center' },
  primaryButton: { width: '100%', minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { minHeight: 42, justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  loginText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});
