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
import { MockDevBanner } from '@/features/auth/components/MockDevBanner';
import { useSendOTP, useVerifyOTP } from '@/features/auth/hooks/use-phone-otp';
import { formatCountdown } from '@/features/auth/utils';

const OTP_EXPIRY_SECONDS = 120;

type Step = 'enter-phone' | 'enter-otp';

/**
 * Phone OTP login screen.
 *
 * Step 1 – Enter phone number → tap "Gửi OTP"
 * Step 2 – Enter 6-digit OTP → countdown + resend → tap "Xác nhận"
 */
export default function PhoneLoginScreen() {
  const [step, setStep] = useState<Step>('enter-phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const { sendOTP, isPending: sending, error: sendError } = useSendOTP();
  const { verifyOTP, isPending: verifying, error: verifyError } = useVerifyOTP();

  // Tick countdown after OTP is sent
  useEffect(() => {
    if (step !== 'enter-otp') return;
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

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step]);

  const handleSendOTP = () => {
    if (!phone.trim()) return;
    sendOTP(
      { phone: phone.trim() },
      { onSuccess: () => setStep('enter-otp') },
    );
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) return;
    verifyOTP({ phone: phone.trim(), otp });
  };

  const handleResend = () => {
    setOtp('');
    sendOTP(
      { phone: phone.trim() },
      {
        onSuccess: () => {
          // Restart countdown
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
        },
      },
    );
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
            <Text style={styles.backBtnText}>← Quay lại</Text>
          </TouchableOpacity>

          {/* ── Title ── */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>
              {step === 'enter-phone' ? '📱 Đăng nhập OTP' : '🔐 Xác nhận OTP'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'enter-phone'
                ? 'Nhập số điện thoại đã đăng ký để nhận mã OTP'
                : `Nhập mã 6 chữ số vừa gửi đến\n${phone}`}
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
                    placeholder="0912 345 678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSendOTP}
                    autoFocus
                  />
                </View>

                {sendError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{sendError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (sending || !phone.trim()) && styles.buttonDisabled,
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
                    (verifying || otp.length < 6) && styles.buttonDisabled,
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

          <MockDevBanner />
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
    gap: 20,
  },
  backBtn: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
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
  changePhoneBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  changePhoneText: {
    fontSize: 14,
    color: '#64748B',
  },
});
