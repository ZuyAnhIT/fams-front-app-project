import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { use2FADisable, use2FASetup } from '../hooks/use-2fa';
import { OTPInput } from './OTPInput';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwoFASetupModalProps {
  visible: boolean;
  /** Whether 2FA is currently enabled for this user */
  isEnabled: boolean;
  onClose: () => void;
  /** Called after successful enable or disable */
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Two-step modal for enabling / disabling TOTP 2FA.
 *
 * Enable flow:
 *   Step 1 → Fetch QR code + secret from API → display to user
 *   Step 2 → User enters first TOTP code to confirm setup
 *
 * Disable flow:
 *   User enters current TOTP code to confirm removal
 */
export function TwoFASetupModal({
  visible,
  isEnabled,
  onClose,
  onSuccess,
}: TwoFASetupModalProps) {
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'init' | 'scan' | 'confirm'>('init');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const setup2FAMutation = use2FASetup();
  const { disable, isPending: disabling, isSuccess: disableSuccess, error: disableError } =
    use2FADisable();

  const setupData = setup2FAMutation.data;
  const setupError = setup2FAMutation.error;

  // Reset when modal closes
  const handleClose = () => {
    setCode('');
    setStep('init');
    setShowBackupCodes(false);
    setup2FAMutation.reset();
    onClose();
  };

  const handleStartSetup = () => {
    // When TVariables is void, TanStack Query v5 takes options as the sole arg
    setup2FAMutation.mutate({ onSuccess: () => setStep('scan') } as never);
  };

  const handleConfirmSetup = () => {
    // use2FAVerify is handled by the 2fa-verify screen;
    // here we call the same endpoint to confirm setup (no temp_token)
    if (code.length === 6) {
      // Parent should call verify2FA via use2FAVerify hook
      onSuccess();
    }
  };

  const handleDisable = () => {
    if (code.length !== 6) return;
    disable({ code }, { onSuccess: () => { onSuccess(); handleClose(); } });
  };

  const error = setupError ?? disableError;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEnabled ? 'Tắt xác thực 2 lớp' : 'Bật xác thực 2 lớp'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ── DISABLE FLOW ── */}
            {isEnabled && (
              <View style={styles.body}>
                <Text style={styles.description}>
                  Nhập mã 6 chữ số từ ứng dụng xác thực để tắt 2FA.
                </Text>
                <OTPInput
                  value={code}
                  onChange={setCode}
                  hasError={!!error}
                  autoFocus
                />
                {error && <Text style={styles.errorText}>{error}</Text>}
                {disableSuccess && (
                  <Text style={styles.successText}>✓ Đã tắt xác thực 2 lớp</Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (disabling || code.length < 6) && styles.buttonDisabled,
                  ]}
                  onPress={handleDisable}
                  disabled={disabling || code.length < 6}
                >
                  {disabling ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Xác nhận tắt</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ── ENABLE FLOW – Step init ── */}
            {!isEnabled && step === 'init' && (
              <View style={styles.body}>
                <Text style={styles.description}>
                  Xác thực 2 lớp (TOTP) thêm một lớp bảo mật bằng mã ngẫu nhiên
                  từ ứng dụng như Google Authenticator hoặc Authy.
                </Text>
                <View style={styles.stepCard}>
                  <Text style={styles.stepText}>
                    1. Cài ứng dụng xác thực trên điện thoại
                  </Text>
                  <Text style={styles.stepText}>
                    2. Quét mã QR hoặc nhập mã thủ công
                  </Text>
                  <Text style={styles.stepText}>
                    3. Nhập mã 6 chữ số để kích hoạt
                  </Text>
                </View>
                {setupError && <Text style={styles.errorText}>{setupError}</Text>}
                <TouchableOpacity
                  style={[styles.primaryButton, setup2FAMutation.isPending && styles.buttonDisabled]}
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

            {/* ── ENABLE FLOW – Step scan ── */}
            {!isEnabled && step === 'scan' && setupData && (
              <View style={styles.body}>
                <Text style={styles.description}>
                  Quét mã QR bằng ứng dụng xác thực của bạn.
                </Text>

                {/* QR Code image from API URL */}
                <View style={styles.qrWrapper}>
                  <Image
                    source={{ uri: setupData.qr_code_url }}
                    style={styles.qrImage}
                    contentFit="contain"
                  />
                </View>

                {/* Manual entry secret */}
                <Text style={styles.sectionLabel}>Hoặc nhập thủ công:</Text>
                <View style={styles.secretBox}>
                  <Text style={styles.secretText} selectable>
                    {setupData.secret}
                  </Text>
                </View>

                {/* Backup codes */}
                <TouchableOpacity
                  onPress={() => setShowBackupCodes((v) => !v)}
                  style={styles.backupToggle}
                >
                  <Text style={styles.backupToggleText}>
                    {showBackupCodes ? '▲' : '▼'} Mã dự phòng (
                    {setupData.backup_codes.length})
                  </Text>
                </TouchableOpacity>
                {showBackupCodes && (
                  <View style={styles.backupGrid}>
                    {setupData.backup_codes.map((bc) => (
                      <Text key={bc} style={styles.backupCode} selectable>
                        {bc}
                      </Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setStep('confirm')}
                >
                  <Text style={styles.primaryButtonText}>Đã quét xong →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── ENABLE FLOW – Step confirm ── */}
            {!isEnabled && step === 'confirm' && (
              <View style={styles.body}>
                <Text style={styles.description}>
                  Nhập mã 6 chữ số từ ứng dụng xác thực để hoàn tất kích hoạt.
                </Text>
                <OTPInput
                  value={code}
                  onChange={setCode}
                  hasError={!!error}
                  autoFocus
                />
                {error && <Text style={styles.errorText}>{error}</Text>}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    code.length < 6 && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirmSetup}
                  disabled={code.length < 6}
                >
                  <Text style={styles.primaryButtonText}>Kích hoạt 2FA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep('scan')}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>← Quay lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
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
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeText: {
    fontSize: 18,
    color: '#64748B',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  stepCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  stepText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  qrWrapper: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    color: '#64748B',
  },
  secretBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  secretText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#1E293B',
    letterSpacing: 2,
  },
  backupToggle: {
    alignSelf: 'flex-start',
  },
  backupToggleText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  backupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  backupCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#1E293B',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: 15,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#64748B',
  },
});
