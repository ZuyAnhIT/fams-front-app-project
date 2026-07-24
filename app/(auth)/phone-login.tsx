import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { useFirebasePhoneAuth } from '@/features/auth/hooks/use-firebase-phone-auth';
import { useVerifyOTP } from '@/features/auth/hooks/use-phone-otp';
import { useAuthTheme } from '@/features/auth/hooks/use-auth-theme';
import { formatCountdown, mapFirebasePhoneError, normalizePhoneForBackend } from '@/features/auth/utils/auth.utils';
import { shadows } from '@/theme/tokens';

const OTP_EXPIRY_SECONDS = 120;

type Step = 'enter-phone' | 'enter-otp';

/**
 * Phone OTP login screen (backlog #2, docs/BACKLOG.md).
 *
 * Step 1 – Enter phone number → Firebase Client SDK sends the SMS directly.
 * Step 2 – Enter 6-digit OTP → confirmed against Firebase → the resulting
 *          Firebase ID token is exchanged for FAMS JWTs (POST /auth/otp/verify).
 *
 * The backend never sees the phone number or the code — only the ID token.
 */
export default function PhoneLoginScreen() {
  const theme = useAuthTheme();
  const [step, setStep] = useState<Step>('enter-phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const { sendCode, confirmCode, isSending: sending } = useFirebasePhoneAuth();
  const { verifyOTP, isPending: verifying, error: verifyError } = useVerifyOTP();

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(OTP_EXPIRY_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleSendOTP = async () => {
    if (!phone.trim()) return;
    setSendError(null);
    try {
      await sendCode(normalizePhoneForBackend(phone));
      setOtp('');
      setStep('enter-otp');
      startCountdown();
    } catch (error: unknown) {
      setSendError(mapFirebasePhoneError(error));
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    try {
      const firebaseIdToken = await confirmCode(otp);
      verifyOTP({ firebaseIdToken });
    } catch (error: unknown) {
      setSendError(mapFirebasePhoneError(error));
    }
  };

  const handleResend = () => {
    handleSendOTP();
  };

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
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>

          {/* ── Title ── */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>
              {step === 'enter-phone' ? 'Đăng nhập OTP' : 'Xác nhận OTP'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'enter-phone'
                ? 'Nhập số điện thoại đã đăng ký (ví dụ: 0912345678)'
                : `Nhập mã 6 chữ số vừa gửi đến\n${normalizePhoneForBackend(phone)}`}
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            {/* ── Step 1: Phone input ── */}
            {step === 'enter-phone' && (
              <View style={styles.body}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="0912345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSendOTP}
                    autoFocus
                    accessibilityLabel="Số điện thoại"
                  />
                  <Text style={styles.hint}>
                    Nhập số bắt đầu bằng 0 — hệ thống tự chuyển sang +84 khi gửi
                  </Text>
                </View>

                {sendError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{sendError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    (sending || !phone.trim()) && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleSendOTP}
                  disabled={sending || !phone.trim()}
                  activeOpacity={0.85}
                >
                  {sending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Gửi OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 2: OTP entry ── */}
            {step === 'enter-otp' && (
              <View style={styles.body}>
                {/* OTP boxes */}
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  hasError={!!verifyError}
                  autoFocus
                />

                {/* Countdown / resend */}
                <View style={styles.countdownRow}>
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>
                      Gửi lại sau{' '}
                      <Text style={styles.countdownTime}>
                        {formatCountdown(countdown)}
                      </Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend} disabled={sending}>
                      <Text style={styles.resendText}>
                        {sending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {verifyError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{verifyError}</Text>
                  </View>
                )}

                {sendError && (
                  <View style={styles.warningBanner}>
                    <Text style={styles.warningText}>{sendError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    (verifying || otp.length < 6) && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={verifying || otp.length < 6}
                  activeOpacity={0.85}
                >
                  {verifying ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Xác nhận</Text>
                  )}
                </TouchableOpacity>

                {/* Change phone */}
                <TouchableOpacity
                  onPress={() => { setStep('enter-phone'); setOtp(''); }}
                  style={styles.changePhoneBtn}
                >
                  <Text style={styles.changePhoneText}>
                    Đổi số điện thoại
                  </Text>
                </TouchableOpacity>
              </View>
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
    justifyContent: 'center',
    padding: 24,
    gap: 20,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
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
  titleArea: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    ...shadows.card,
    overflow: 'hidden',
  },
  body: {
    padding: 24,
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
    fontSize: 18,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  countdownRow: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 14,
    color: '#64748B',
  },
  countdownTime: {
    color: '#2563EB',
    fontWeight: '700',
  },
  resendText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  changePhoneBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  changePhoneText: {
    fontSize: 14,
    color: '#64748B',
  },
});
