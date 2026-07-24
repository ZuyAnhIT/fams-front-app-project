import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { KeyboardAwareModalSheet } from '@/components/ui/keyboard-aware-sheet';
import { useToast } from '@/components/ui/toast';

import { useIdentifierChange } from '../hooks/use-identifier-change';
import { useAuthTheme } from '../theme';
import type { UserProfile } from '../types';
import { OTPInput } from './OTPInput';

interface Props {
  visible: boolean;
  method: 'email' | 'phone';
  profile: UserProfile;
  onClose: () => void;
}

export function AccountIdentifierModal({ visible, method, profile, onClose }: Props) {
  const theme = useAuthTheme();
  const { showToast } = useToast();
  const [value, setValue] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const { requestEmail, requestPhone, confirmPhone, isPending, error, reset } =
    useIdentifierChange();

  useEffect(() => {
    if (visible) {
      setValue('');
      setOtp('');
      setOtpSent(false);
      setEmailSent(false);
      setResendSeconds(0);
      reset();
    }
    // Mutations are intentionally reset only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, method]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const close = () => {
    reset();
    onClose();
  };

  const requestCodeOrLink = async () => {
    try {
      if (method === 'email') {
        const email = value.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          showToast('Email không hợp lệ', 'error');
          return;
        }
        await requestEmail({ email });
        setEmailSent(true);
        showToast('Đã gửi liên kết xác nhận tới email mới', 'success');
        return;
      }

      if (value.replace(/\D/g, '').length < 9) {
        showToast('Số điện thoại không hợp lệ', 'error');
        return;
      }
      await requestPhone({ phone: value });
      setOtpSent(true);
      setResendSeconds(60);
      showToast('Đã gửi mã OTP', 'success');
    } catch {
      // The mutation exposes the normalized backend message below the input.
    }
  };

  const submitOtp = async () => {
    if (otp.length !== 6) return;
    try {
      await confirmPhone({ phone: value, otp_code: otp });
      showToast('Đổi số điện thoại thành công', 'success');
      close();
    } catch {
      // The mutation exposes the normalized backend message below the OTP.
    }
  };

  const title = method === 'email' ? 'Đổi email' : 'Đổi số điện thoại';
  const current = method === 'email' ? profile.email : profile.phone;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <KeyboardAwareModalSheet>
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
            <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              <TouchableOpacity onPress={close}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                Hiện tại: {current || 'Chưa thiết lập'}
              </Text>

              {emailSent ? (
                <View style={styles.centered}>
                  <Ionicons name="mail-unread-outline" size={48} color={theme.success} />
                  <Text style={[styles.successTitle, { color: theme.success }]}>Đã gửi email</Text>
                  <Text style={[styles.description, { color: theme.textSecondary, textAlign: 'center' }]}>
                    Mở liên kết trong email mới để hoàn tất. Liên kết chỉ dùng một lần.
                  </Text>
                </View>
              ) : (
                <>
                  {!otpSent && (
                    <TextInput
                      value={value}
                      onChangeText={setValue}
                      editable={!isPending}
                      autoCapitalize="none"
                      keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
                      placeholder={method === 'email' ? 'email-moi@example.com' : '09xxxxxxxx'}
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.input,
                        { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border },
                      ]}
                    />
                  )}

                  {otpSent && (
                    <>
                      <Text style={[styles.description, { color: theme.textSecondary }]}>
                        Nhập mã OTP 6 số đã gửi tới {value}.
                      </Text>
                      <OTPInput value={otp} onChange={setOtp} hasError={!!error} autoFocus />
                    </>
                  )}

                  {error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: theme.primary },
                      isPending && { backgroundColor: theme.primaryDisabled },
                    ]}
                    disabled={isPending || (otpSent && otp.length !== 6)}
                    onPress={otpSent ? submitOtp : requestCodeOrLink}
                  >
                    {isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {otpSent ? 'Xác nhận đổi số' : method === 'email' ? 'Gửi liên kết xác nhận' : 'Gửi mã OTP'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {otpSent && (
                    <TouchableOpacity onPress={requestCodeOrLink} disabled={isPending || resendSeconds > 0}>
                      <Text style={[styles.link, { color: resendSeconds > 0 ? theme.textMuted : theme.primary }]}>
                        {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : 'Gửi lại mã OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </KeyboardAwareModalSheet>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { padding: 24, gap: 16 },
  description: { fontSize: 14, lineHeight: 21 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  button: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { fontSize: 13, textAlign: 'center' },
  centered: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  successTitle: { fontSize: 18, fontWeight: '700' },
  link: { textAlign: 'center', fontWeight: '600', paddingVertical: 4 },
});
