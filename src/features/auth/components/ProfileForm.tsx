import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
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

import { useAvatarUpload } from '../hooks/use-avatar-upload';
import { useUpdateProfile } from '../hooks/use-profile';
import { useAuthTheme } from '../theme';
import type { UserProfile } from '../types';

const schema = z.object({
  full_name: z.string().min(2, 'Họ tên ít nhất 2 ký tự').max(100, 'Họ tên quá dài'),
  phone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface ProfileFormProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
}

export function ProfileForm({ visible, profile, onClose }: ProfileFormProps) {
  const theme = useAuthTheme();
  const { showToast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const { update, isPending, isSuccess, error, reset: resetMutation } = useUpdateProfile();
  const { pickAndUploadAsync, isPending: isUploading, error: uploadError } = useAvatarUpload();

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile.full_name,
      phone: profile.phone ?? '',
    },
  });

  useEffect(() => {
    if (visible) {
      resetForm({
        full_name: profile.full_name,
        phone: profile.phone ?? '',
      });
      setAvatarUrl(profile.avatar_url ?? '');
      resetMutation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (isSuccess) {
      showToast('Cập nhật hồ sơ thành công', 'success');
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const handleClose = () => {
    resetMutation();
    onClose();
  };

  const handlePickAvatar = async () => {
    try {
      const url = await pickAndUploadAsync();
      setAvatarUrl(url);
      showToast('Đã tải ảnh lên', 'success');
    } catch {
      // errors surfaced via uploadError
    }
  };

  const onSubmit = ({ full_name, phone }: FormData) =>
    update({
      full_name,
      phone: phone || undefined,
      avatar_url: avatarUrl,
    });

  const displayError = error ?? uploadError;
  const initial = profile.full_name.charAt(0).toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <KeyboardAwareModalSheet debugName="ProfileForm">
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.title, { color: theme.text }]}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
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
                <Text style={[styles.successTitle, { color: theme.success }]}>
                  Cập nhật thành công!
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.avatarSection}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.inputBg }]}>
                      <Text style={[styles.avatarInitial, { color: theme.primary }]}>{initial}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.avatarButton, { borderColor: theme.border }]}
                    onPress={handlePickAvatar}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Text style={[styles.avatarButtonText, { color: theme.primary }]}>
                        Đổi ảnh đại diện
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Họ và tên</Text>
                  <Controller
                    control={control}
                    name="full_name"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                          errors.full_name && styles.inputError,
                        ]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => logModalInputFocus('ProfileForm', 'full_name')}
                        placeholder="Nguyễn Văn A"
                        placeholderTextColor={theme.textMuted}
                        autoCapitalize="words"
                      />
                    )}
                  />
                  {errors.full_name && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.full_name.message}
                    </Text>
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    Số điện thoại <Text style={{ color: theme.textMuted }}>(không bắt buộc)</Text>
                  </Text>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                          errors.phone && styles.inputError,
                        ]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => logModalInputFocus('ProfileForm', 'phone')}
                        placeholder="0901234567"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="phone-pad"
                      />
                    )}
                  />
                  {errors.phone && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.phone.message}
                    </Text>
                  )}
                </View>

                <View style={[styles.readOnlyBox, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>
                    Email (không thể thay đổi)
                  </Text>
                  <Text style={[styles.readOnlyValue, { color: theme.text }]}>{profile.email}</Text>
                </View>

                {displayError && (
                  <View
                    style={[
                      styles.errorBanner,
                      { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
                    ]}
                  >
                    <Text style={[styles.errorText, { color: theme.error }]}>{displayError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    (isPending || isUploading) && { backgroundColor: theme.primaryDisabled },
                  ]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isPending || isUploading}
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Lưu thay đổi</Text>
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

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
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
  title: { fontSize: 18, fontWeight: '700' },
  closeText: { fontSize: 18 },
  body: { paddingHorizontal: 24, paddingTop: 20, gap: 16, paddingBottom: 8 },
  avatarSection: { alignItems: 'center', gap: 12 },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 32, fontWeight: '800' },
  avatarButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarButtonText: { fontSize: 14, fontWeight: '600' },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12 },
  readOnlyBox: { borderRadius: 12, padding: 12, gap: 4 },
  readOnlyLabel: { fontSize: 12 },
  readOnlyValue: { fontSize: 14, fontWeight: '500' },
  errorBanner: { borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13 },
  primaryButton: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  successIcon: { fontSize: 48 },
  successTitle: { fontSize: 18, fontWeight: '700' },
});
