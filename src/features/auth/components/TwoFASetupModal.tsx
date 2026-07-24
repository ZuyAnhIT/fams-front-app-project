import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { KeyboardAwareModalSheet } from '@/components/ui/keyboard-aware-sheet';

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
  const [step, setStep] = useState<'init' | 'scan' | 'confirm' | 'backup'>('init');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableMethod, setDisableMethod] = useState<'password' | 'code' | 'backup'>('password');
  const [disableProof, setDisableProof] = useState('');

  const setup2FAMutation = use2FASetup();
  const { confirm, isPending: confirming, error: confirmError, reset: resetConfirm } =
    use2FAConfirmSetup();
  const { disable, isPending: disabling, isSuccess: disableSuccess, error: disableError, reset: resetDisable } =
    use2FADisable();

  const setupData = setup2FAMutation.data;
  const setupError = setup2FAMutation.error;
  const error = setupError ?? confirmError ?? disableError;

  const handleClose = (force = false) => {
    if (step === 'backup' && !force) {
      showToast('Hãy lưu mã dự phòng trước khi đóng', 'error');
      return;
    }
    setCode('');
    setBackupCodes([]);
    setDisableProof('');
    setDisableMethod('password');
    setStep('init');
    setup2FAMutation.reset();
    resetConfirm();
    resetDisable();
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
        onSuccess: (data) => {
          showToast('Đã bật xác thực 2 lớp', 'success');
          setBackupCodes(data.backup_codes);
          setStep('backup');
        },
        onError: (err) => showToast(parseAuthError(err), 'error'),
      },
    );
  };

  const handleDisable = () => {
    const proof = disableProof.trim();
    if (!proof) {
      showToast('Vui lòng nhập thông tin xác nhận', 'error');
      return;
    }
    disable(
      disableMethod === 'password'
        ? { password: proof }
        : disableMethod === 'code'
          ? { code: proof }
          : { backup_code: proof },
      {
      onSuccess: () => {
        showToast('Đã tắt xác thực 2 lớp', 'success');
        onSuccess();
        handleClose();
      },
      onError: (err) => showToast(parseAuthError(err), 'error'),
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => handleClose()}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <KeyboardAwareModalSheet>
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              {isEnabled ? 'Tắt xác thực 2 lớp' : 'Bật xác thực 2 lớp'}
            </Text>
            <TouchableOpacity onPress={() => handleClose()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
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
                  Xác nhận bằng mật khẩu, mã TOTP hoặc một mã dự phòng.
                </Text>
                <View style={styles.methodRow}>
                  {([
                    ['password', 'Mật khẩu'],
                    ['code', 'Mã TOTP'],
                    ['backup', 'Mã dự phòng'],
                  ] as const).map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.methodButton,
                        { borderColor: theme.border },
                        disableMethod === value && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => {
                        setDisableMethod(value);
                        setDisableProof('');
                      }}
                    >
                      <Text style={{ color: disableMethod === value ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={disableProof}
                  onChangeText={setDisableProof}
                  secureTextEntry={disableMethod === 'password'}
                  keyboardType={disableMethod === 'code' ? 'number-pad' : 'default'}
                  maxLength={disableMethod === 'code' ? 6 : undefined}
                  autoCapitalize="none"
                  placeholder={disableMethod === 'password' ? 'Nhập mật khẩu' : disableMethod === 'code' ? 'Nhập mã 6 số' : 'Nhập mã dự phòng'}
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }]}
                />
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
                  disabled={disabling || !disableProof.trim()}
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
                  Mở mã QR để quét từ thiết bị khác, hoặc dùng khóa thủ công bên dưới
                  khi ứng dụng xác thực nằm trên chính điện thoại này.
                </Text>
                <View style={[styles.qrWrapper, { backgroundColor: theme.inputBg }]}>
                  <Ionicons name="qr-code-outline" size={72} color={theme.primary} />
                  <TouchableOpacity
                    style={[styles.qrButton, { borderColor: theme.primary }]}
                    onPress={() => void WebBrowser.openBrowserAsync(setupData.qr_code_url)}
                  >
                    <Text style={[styles.qrButtonText, { color: theme.primary }]}>Mở trang mã QR</Text>
                  </TouchableOpacity>
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

            {!isEnabled && step === 'backup' && (
              <View style={styles.body}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.success} style={{ alignSelf: 'center' }} />
                <Text style={[styles.description, { color: theme.textSecondary, textAlign: 'center' }]}>
                  Lưu các mã dự phòng này ở nơi an toàn. Mỗi mã chỉ dùng được một lần và sẽ không hiển thị lại.
                </Text>
                <View style={[styles.backupBox, { backgroundColor: theme.inputBg }]}>
                  {backupCodes.map((backupCode) => (
                    <Text key={backupCode} selectable style={[styles.backupCode, { color: theme.text }]}>{backupCode}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    onSuccess();
                    handleClose(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Tôi đã lưu các mã này</Text>
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
  qrButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  qrButtonText: { fontSize: 14, fontWeight: '700' },
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
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodButton: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  backupBox: { borderRadius: 12, padding: 16, gap: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  backupCode: { width: '47%', fontFamily: 'monospace', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
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
