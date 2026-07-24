import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
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

import { KeyboardAwareModalSheet } from '@/components/ui/keyboard-aware-sheet';
import { useToast } from '@/components/ui/toast';

import { useAvatarUpload } from '../hooks/use-avatar-upload';
import { useUpdateProfile } from '../hooks/use-profile';
import { useAuthTheme } from '../theme';
import type { UserProfile } from '../types';

// Issue #4 (docs/issues/ISSUES.md): dd/mm/yyyy text input — no native date-picker dependency
// is installed in this project yet, so a validated text field avoids adding a new native
// module (which would need a fresh EAS dev-client build, currently blocked — see docs/PROJECT_HANDOFF.md).
const DOB_REGEX = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d{2}$/;

const schema = z.object({
  full_name: z.string().min(2, 'Họ tên ít nhất 2 ký tự').max(100, 'Họ tên quá dài'),
  date_of_birth: z
    .string()
    .regex(DOB_REGEX, 'Định dạng ngày/tháng/năm không hợp lệ (VD: 15/04/1995)')
    .optional()
    .or(z.literal('')),
  hometown: z.string().max(255, 'Quê quán quá dài').optional().or(z.literal('')),
  address: z.string().max(500, 'Địa chỉ quá dài').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

/** dd/mm/yyyy (as typed) <-> yyyy-MM-dd (as the backend expects) */
function dobToIso(dob: string): string | undefined {
  const match = dob.match(DOB_REGEX);
  if (!match) return undefined;
  const [day, month, year] = dob.split('/');
  return `${year}-${month}-${day}`;
}

function isoToDob(iso?: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}/${month}/${year}` : '';
}

interface ProfileFormProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
}

export function ProfileForm({ visible, profile, onClose }: ProfileFormProps) {
  const theme = useAuthTheme();
  const { showToast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [gender, setGender] = useState(profile.gender ?? '');
  const { update, isPending, isSuccess, error, reset: resetMutation } = useUpdateProfile();
  const {
    pickAndUploadAsync,
    deleteAvatarAsync,
    isPending: isUploading,
    error: uploadError,
  } = useAvatarUpload();

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile.full_name,
      date_of_birth: isoToDob(profile.date_of_birth),
      hometown: profile.hometown ?? '',
      address: profile.address ?? '',
    },
  });

  useEffect(() => {
    if (visible) {
      resetForm({
        full_name: profile.full_name,
        date_of_birth: isoToDob(profile.date_of_birth),
        hometown: profile.hometown ?? '',
        address: profile.address ?? '',
      });
      setAvatarUrl(profile.avatar_url ?? '');
      setGender(profile.gender ?? '');
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

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (uploadError) {
      showToast(uploadError, 'error');
    }
  }, [uploadError, showToast]);

  const handleClose = () => {
    resetMutation();
    onClose();
  };

  const handlePickAvatar = async () => {
    try {
      const updatedProfile = await pickAndUploadAsync();
      setAvatarUrl(updatedProfile.avatar_url ?? '');
      showToast('Đã tải ảnh lên', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không thể tải ảnh lên';
      showToast(message, 'error');
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatarAsync();
      setAvatarUrl('');
      showToast('Đã xóa ảnh đại diện', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không thể xóa ảnh đại diện';
      showToast(message, 'error');
    }
  };

  const requestDeleteAvatar = () => {
    Alert.alert(
      'Xóa ảnh đại diện?',
      'Ảnh hiện tại sẽ bị xóa khỏi hồ sơ của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => void handleDeleteAvatar() },
      ],
    );
  };

  const onSubmit = ({ full_name, date_of_birth, hometown, address }: FormData) =>
    update({
      full_name,
      date_of_birth: date_of_birth ? dobToIso(date_of_birth) : undefined,
      hometown: hometown || undefined,
      gender: gender || undefined,
      address: address || undefined,
    });

  const displayError = error ?? uploadError;
  const initial = profile.full_name.charAt(0).toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <KeyboardAwareModalSheet>
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.title, { color: theme.text }]}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
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
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.success} />
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
                  {avatarUrl && (
                    <TouchableOpacity
                      style={styles.deleteAvatarButton}
                      onPress={requestDeleteAvatar}
                      disabled={isUploading}
                    >
                      <Text style={[styles.deleteAvatarText, { color: theme.error }]}>Xóa ảnh</Text>
                    </TouchableOpacity>
                  )}
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
                    Ngày sinh <Text style={{ color: theme.textMuted }}>(không bắt buộc)</Text>
                  </Text>
                  <Controller
                    control={control}
                    name="date_of_birth"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                          errors.date_of_birth && styles.inputError,
                        ]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="15/04/1995"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={10}
                      />
                    )}
                  />
                  {errors.date_of_birth && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.date_of_birth.message}
                    </Text>
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Giới tính</Text>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = gender === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.genderOption,
                            { borderColor: theme.border },
                            selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                          ]}
                          onPress={() => setGender(selected ? '' : option.value)}
                        >
                          <Text
                            style={[
                              styles.genderOptionText,
                              { color: selected ? '#ffffff' : theme.text },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    Quê quán <Text style={{ color: theme.textMuted }}>(không bắt buộc)</Text>
                  </Text>
                  <Controller
                    control={control}
                    name="hometown"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                        ]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Nghệ An"
                        placeholderTextColor={theme.textMuted}
                      />
                    )}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    Địa chỉ <Text style={{ color: theme.textMuted }}>(không bắt buộc)</Text>
                  </Text>
                  <Controller
                    control={control}
                    name="address"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          styles.multilineInput,
                          { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                        ]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                        placeholderTextColor={theme.textMuted}
                        multiline
                        numberOfLines={2}
                      />
                    )}
                  />
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
  deleteAvatarButton: { paddingHorizontal: 12, paddingVertical: 4 },
  deleteAvatarText: { fontSize: 13, fontWeight: '600' },
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
  multilineInput: { minHeight: 64, textAlignVertical: 'top' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderOptionText: { fontSize: 14, fontWeight: '600' },
  fieldError: { fontSize: 12 },
  errorBanner: { borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13 },
  primaryButton: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  successTitle: { fontSize: 18, fontWeight: '700' },
});
