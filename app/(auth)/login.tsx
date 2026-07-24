import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { shadows } from '@/theme/tokens';

/**
 * Main password-login screen. The identifier field accepts either email or
 * phone, matching the backend `/auth/login` contract.
 */
export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={styles.brandArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>F</Text>
            </View>
            <Text style={styles.appName}>FAMS</Text>
            <Text style={styles.tagLine}>Factory Attendance Management</Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            <LoginForm />
          </View>

          <TouchableOpacity
            style={styles.otpLoginButton}
            onPress={() => router.push('/(auth)/phone-login' as never)}
          >
            <Text style={styles.otpLoginText}>Đăng nhập bằng OTP điện thoại</Text>
          </TouchableOpacity>

          {/* ── Footer ── */}
          <Text style={styles.footer}>© 2026 FAMS · v1.0.0</Text>
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
    justifyContent: 'center',
    padding: 24,
    gap: 24,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  brandArea: {
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.brand,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 2,
  },
  tagLine: {
    fontSize: 13,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    ...shadows.card,
  },
  otpLoginButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  otpLoginText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
  },
});
