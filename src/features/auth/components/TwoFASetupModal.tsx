import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  KeyboardAwareModalSheet,
  logModalInputFocus,
} from '@/components/ui/keyboard-aware-sheet';

import { useToast } from '@/components/ui/toast';

import { use2FAConfirmSetup, use2FADisable, use2FASetup } from '../hooks/use-2fa';
import { useAuthTheme } from '../theme';
import { parseAuthError } from '../utils';
import { OTPInput } from './OTPInput';

interface TwoFASetupModalProps {
  visible: boolean;
  isEnabled: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TwoFASetupModal({
  visible,
  isEnabled,
  onClose,
  onSuccess,
}: TwoFASetupModalProps) {
  const theme = useAuthTheme();
  const { showToast } = useToast();
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'init' | 'scan' | 'confirm'>('init');

  const setup2FAMutation = use2FASetup();
  const { confirm, isPending: confirming, error: confirmError, reset: resetConfirm } =
    use2FAConfirmSetup();
  const { disable, isPending: disabling, isSuccess: disableSuccess, error: disableError } =
    use2FADisable();

  const setupData = setup2FAMutation.data;
  const setupError = setup2FAMutation.error;
  const error = setupError ?? confirmError ?? disableError;

  const handleClose = () => {
    setCode('');
    setStep('init');
    setup2FAMutation.reset();
    resetConfirm();
    onClose();
  };

  const handleStartSetup = () => {
    setup2FAMutation.mutate(undefined, {
      onSuccess: () => setStep('scan'),
      onError: () => showToast('Không thể khởi tạo 2FA', 'error'),
    });
  };

  const handleConfirmSetup = () => {
    if (!setupData?.setup_token || code.length !== 6) return;
    confirm(
      { setup_token: setupData.setup_token, code },
      {
        onSuccess: () => {
          showToast('Đã bật xác thực 2 lớp', 'success');
          onSuccess();
          handleClose();
        },
        onError: (err) => showToast(parseAuthError(err), 'error'),
      },
    );
  };

  const handleDisable = () => {
    disable(undefined, {
      onSuccess: () => {
        showToast('Đã tắt xác thực 2 lớp', 'success');
        onSuccess();
        handleClose();
      },
      onError: (err) => showToast(parseAuthError(err), 'error'),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <KeyboardAwareModalSheet debugName="TwoFASetupModal">
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              {isEnabled ? 'Tắt xác thực 2 lớp' : 'Bật xác thực 2 lớp'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {isEnabled && (
              <View style={styles.body}>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Xác nhận tắt xác thực 2 lớp (TOTP) cho tài khoản của bạn.
                </Text>
                {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
                {disableSuccess && (
                  <Text style={[styles.successText, { color: theme.success }]}>
                    ✓ Đã tắt xác thực 2 lớp
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    disabling && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleDisable}
                  disabled={disabling}
                >
                  {disabling ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Xác nhận tắt 2FA</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!isEnabled && step === 'init' && (
              <View style={styles.body}>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Xác thực 2 lớp (TOTP) thêm một lớp bảo mật bằng mã ngẫu nhiên từ ứng dụng như
                  Google Authenticator hoặc Authy.
                </Text>
                <View style={[styles.stepCard, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.stepText, { color: theme.primary }]}>
                    1. Cài ứng dụng xác thực trên điện thoại
                  </Text>
                  <Text style={[styles.stepText, { color: theme.primary }]}>
                    2. Quét mã QR hoặc nhập mã thủ công
                  </Text>
                  <Text style={[styles.stepText, { color: theme.primary }]}>
                    3. Nhập mã 6 chữ số để kích hoạt
                  </Text>
                </View>
                {setupError && (
                  <Text style={[styles.errorText, { color: theme.error }]}>{setupError}</Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    setup2FAMutation.isPending && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleStartSetup}
                  disabled={setup2FAMutation.isPending}
                >
                  {setup2FAMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Tiếp tục</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!isEnabled && step === 'scan' && setupData && (
              <View style={styles.body}>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Quét mã QR bằng ứng dụng xác thực của bạn.
                </Text>
                <View style={[styles.qrWrapper, { backgroundColor: theme.inputBg }]}>
                  <Image
                    source={{ uri: setupData.qr_code_url }}
                    style={styles.qrImage}
                    contentFit="contain"
                  />
                </View>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Hoặc nhập thủ công:
                </Text>
                <View style={[styles.secretBox, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.secretText, { color: theme.text }]} selectable>
                    {setupData.secret}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  onPress={() => setStep('confirm')}
                >
                  <Text style={styles.primaryButtonText}>Đã quét xong →</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isEnabled && step === 'confirm' && (
              <View style={styles.body}>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Nhập mã 6 chữ số từ ứng dụng xác thực để hoàn tất kích hoạt.
                </Text>
                <OTPInput value={code} onChange={setCode} hasError={!!error} autoFocus />
                {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    (confirming || code.length < 6) && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleConfirmSetup}
                  disabled={confirming || code.length < 6}
                >
                  {confirming ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Kích hoạt 2FA</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('scan')} style={styles.backButton}>
                  <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>
                    ← Quay lại
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          </View>
        </KeyboardAwareModalSheet>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 18,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  stepCard: {
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  qrWrapper: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  secretBox: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  secretText: {
    fontFamily: 'monospace',
    fontSize: 14,
    letterSpacing: 2,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
  },
});
