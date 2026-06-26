import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { z } from 'zod';

import {
  KeyboardAwareModalSheet,
  logModalInputFocus,
} from '@/components/ui/keyboard-aware-sheet';
import { useToast } from '@/components/ui/toast';

import { useChangePassword } from '../hooks/use-change-password';
import { useAuthTheme } from '../theme';

// ─── Validation Schema ────────────────────────────────────────────────────────

const schema = z
  .object({
    current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    new_password: z
      .string()
      .min(8, 'Mật khẩu mới ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
      .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
    confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  })
  .refine((d) => d.current_password !== d.new_password, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['new_password'],
  });

type FormData = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordChangeFormProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Bottom-sheet modal for changing the user's password.
 * confirm_password is validated client-side only and stripped before API call.
 */
export function PasswordChangeForm({ visible, onClose }: PasswordChangeFormProps) {
  const theme = useAuthTheme();
  const { showToast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { submit, isPending, isSuccess, error, reset: resetMutation } = useChangePassword();

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const handleClose = () => {
    resetForm();
    resetMutation();
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  useEffect(() => {
    if (isSuccess) {
      showToast('Đổi mật khẩu thành công', 'success');
      const t = setTimeout(handleClose, 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const onSubmit = ({ current_password, new_password }: FormData) =>
    submit({ current_password, new_password });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAwareModalSheet debugName="PasswordChangeForm">
          <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Đổi mật khẩu</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {isSuccess ? (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Đổi mật khẩu thành công!</Text>
                <Text style={styles.successSub}>Cửa sổ sẽ tự đóng...</Text>
              </View>
            ) : (
              <>
                {/* Current password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mật khẩu hiện tại</Text>
                  <Controller
                    control={control}
                    name="current_password"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[
                            styles.inputFlex,
                            errors.current_password && styles.inputError,
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          onFocus={() => logModalInputFocus('PasswordChangeForm', 'current_password')}
                          placeholder="Nhập mật khẩu hiện tại"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showCurrent}
                          autoCapitalize="none"
                          returnKeyType="next"
                        />
                        <TouchableOpacity
                          onPress={() => setShowCurrent((v) => !v)}
                          style={styles.eyeBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.eyeIcon}>
                            {showCurrent ? '🙈' : '👁️'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.current_password && (
                    <Text style={styles.fieldError}>
                      {errors.current_password.message}
                    </Text>
                  )}
                </View>

                {/* New password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mật khẩu mới</Text>
                  <Controller
                    control={control}
                    name="new_password"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[
                            styles.inputFlex,
                            errors.new_password && styles.inputError,
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showNew}
                          autoCapitalize="none"
                          returnKeyType="next"
                        />
                        <TouchableOpacity
                          onPress={() => setShowNew((v) => !v)}
                          style={styles.eyeBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.new_password && (
                    <Text style={styles.fieldError}>
                      {errors.new_password.message}
                    </Text>
                  )}
                </View>

                {/* Confirm new password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                  <Controller
                    control={control}
                    name="confirm_password"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[
                            styles.inputFlex,
                            errors.confirm_password && styles.inputError,
                          ]}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          onFocus={() => logModalInputFocus('PasswordChangeForm', 'confirm_password')}
                          placeholder="Nhập lại mật khẩu mới"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showConfirm}
                          autoCapitalize="none"
                          returnKeyType="done"
                          onSubmitEditing={handleSubmit(onSubmit)}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirm((v) => !v)}
                          style={styles.eyeBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.eyeIcon}>
                            {showConfirm ? '🙈' : '👁️'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.confirm_password && (
                    <Text style={styles.fieldError}>
                      {errors.confirm_password.message}
                    </Text>
                  )}
                </View>

                {/* API error */}
                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.primaryButton, isPending && styles.buttonDisabled]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isPending}
                  activeOpacity={0.85}
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Đổi mật khẩu</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
          </View>
        </KeyboardAwareModalSheet>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    paddingBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
  },
  passwordRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  eyeBtn: {
    paddingHorizontal: 4,
  },
  eyeIcon: {
    fontSize: 18,
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
  successBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
  },
});
