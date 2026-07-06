import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordChangeForm } from '@/features/auth/components/PasswordChangeForm';
import { ProfileForm } from '@/features/auth/components/ProfileForm';
import { TwoFASetupModal } from '@/features/auth/components/TwoFASetupModal';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useProfile } from '@/features/auth/hooks/use-profile';
import { useAuthTheme } from '@/features/auth/theme';
import type { UserProfile } from '@/features/auth/types';

import { ProfileFaceSection } from './ProfileFaceSection';
import { ProfileSettingsRow } from './ProfileSettingsRow';

const ROLE_LABEL: Record<UserProfile['role'], string> = {
  employee: 'Nhân viên',
  manager: 'Quản lý',
  admin: 'Quản trị viên',
  hr: 'Nhân sự',
};

const ROLE_COLOR: Record<UserProfile['role'], string> = {
  employee: '#2563EB',
  manager: '#7C3AED',
  admin: '#DC2626',
  hr: '#059669',
};

/**
 * Màn hình Hồ sơ — thông tin cá nhân, Face ID, lời mời, bảo mật & đăng xuất.
 */
export function ProfileScreen() {
  const theme = useAuthTheme();
  const router = useRouter();
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [twoFAVisible, setTwoFAVisible] = useState(false);

  const { profile, isLoading, isError, refetch } = useProfile();
  const { logout, logoutAll, isPending: isLoggingOut } = useLogout();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Đang tải hồ sơ...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Không thể tải hồ sơ</Text>
          <Text style={styles.errorDesc}>
            Đã có lỗi xảy ra khi tải thông tin. Vui lòng thử lại.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi thiết bị này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      'Đăng xuất tất cả',
      'Bạn sẽ bị đăng xuất khỏi tất cả thiết bị. Tiếp tục?',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xác nhận', style: 'destructive', onPress: logoutAll },
      ],
    );
  };

  const roleColor = ROLE_COLOR[profile.role];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.identityCard, { backgroundColor: theme.card }]}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={[styles.avatarCircle, { borderColor: roleColor }]}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.avatarCircle,
                { borderColor: roleColor, backgroundColor: theme.inputBg },
              ]}
            >
              <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                {profile.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.identityTexts}>
            <Text style={[styles.fullName, { color: theme.text }]}>{profile.full_name}</Text>
            <Text style={[styles.email, { color: theme.textSecondary }]}>{profile.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}18` }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                {ROLE_LABEL[profile.role]}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
          {profile.phone && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Số điện thoại
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{profile.phone}</Text>
            </View>
          )}
          {profile.department && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Phòng ban</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{profile.department}</Text>
            </View>
          )}
          {profile.employee_code && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Mã nhân viên
              </Text>
              <Text style={[styles.detailValue, styles.monoText, { color: theme.text }]}>
                {profile.employee_code}
              </Text>
            </View>
          )}

          {profile.locked_until && new Date(profile.locked_until) > new Date() && (
            <View style={[styles.lockedBanner, { borderColor: theme.errorBorder }]}>
              <Text style={[styles.lockedText, { color: theme.error }]}>
                🔒 Tài khoản tạm khóa đến{' '}
                {new Date(profile.locked_until).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        <ProfileFaceSection />

        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Công việc</Text>

          <ProfileSettingsRow
            icon="🏗️"
            label="Công trình"
            sublabel="Danh sách và chi tiết công trình"
            onPress={() =>
              // expo-router typed routes chỉ nhận diện `/site` sau khi chạy `expo start`
              // một lần để regenerate `.expo/types`; cast tạm thời cho đến khi đó.
              router.push('/site' as unknown as Parameters<typeof router.push>[0])
            }
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="🏢"
            label="Chuyển đổi công ty"
            sublabel="Đổi công ty đang thao tác — không cần đăng xuất"
            onPress={() => router.push('/(auth)/select-tenant' as never)}
            theme={theme}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Bảo mật</Text>

          <ProfileSettingsRow
            icon="✏️"
            label="Chỉnh sửa hồ sơ"
            sublabel="Tên, ảnh đại diện, số điện thoại"
            onPress={() => setEditProfileVisible(true)}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="🔐"
            label="Đổi mật khẩu"
            onPress={() => setChangePasswordVisible(true)}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon={profile.is_2fa_enabled ? '🛡️' : '🔓'}
            label={profile.is_2fa_enabled ? 'Xác thực 2 lớp · Đang bật' : 'Bật xác thực 2 lớp'}
            sublabel={
              profile.is_2fa_enabled
                ? 'Nhấn để tắt 2FA'
                : 'Tăng cường bảo mật tài khoản'
            }
            onPress={() => setTwoFAVisible(true)}
            theme={theme}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Tài khoản</Text>

          <ProfileSettingsRow
            icon="🚪"
            label="Đăng xuất"
            sublabel="Thiết bị hiện tại"
            onPress={handleLogout}
            destructive
            loading={isLoggingOut}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="🗑️"
            label="Đăng xuất tất cả thiết bị"
            sublabel="Thu hồi mọi phiên đang hoạt động"
            onPress={handleLogoutAll}
            destructive
            loading={isLoggingOut}
            theme={theme}
          />
        </View>

        <Text style={[styles.footer, { color: theme.textMuted }]}>FAMS · v1.0.0</Text>
      </ScrollView>

      <ProfileForm
        visible={editProfileVisible}
        profile={profile}
        onClose={() => setEditProfileVisible(false)}
      />

      <PasswordChangeForm
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />

      <TwoFASetupModal
        visible={twoFAVisible}
        isEnabled={profile.is_2fa_enabled}
        onClose={() => setTwoFAVisible(false)}
        onSuccess={() => {
          setTwoFAVisible(false);
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 32 },
  identityCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { fontSize: 28, fontWeight: '800' },
  identityTexts: { flex: 1, gap: 4 },
  fullName: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 13 },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  detailCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: 13 },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  monoText: { fontFamily: 'monospace', letterSpacing: 1 },
  lockedBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  lockedText: { fontSize: 13, fontWeight: '500' },
  sectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  separator: { height: 1, marginLeft: 56 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  errorContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorIcon: { fontSize: 56 },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 12 },
});
