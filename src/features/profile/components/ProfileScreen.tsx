import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { PasswordChangeForm } from '@/features/auth/components/PasswordChangeForm';
import { ProfileForm } from '@/features/auth/components/ProfileForm';
import { TwoFASetupModal } from '@/features/auth/components/TwoFASetupModal';
import { AccountIdentifierModal } from '@/features/auth/components/AccountIdentifierModal';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useGoogleAccountLink } from '@/features/auth/hooks/use-google-account-link';
import { useProfile } from '@/features/auth/hooks/use-profile';
import { useAuthTheme } from '@/features/auth/theme';
import type { UserProfile } from '@/features/auth/types';
import { shadows } from '@/theme/tokens';

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

// Issue #4 (docs/issues/ISSUES.md)
const GENDER_LABEL: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

function formatDob(iso: string): string {
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

/**
 * Màn hình Hồ sơ — thông tin cá nhân, Face ID, lời mời, bảo mật & đăng xuất.
 */
export function ProfileScreen() {
  const theme = useAuthTheme();
  const router = useRouter();
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [twoFAVisible, setTwoFAVisible] = useState(false);
  const [identifierMethod, setIdentifierMethod] = useState<'email' | 'phone' | null>(null);
  const [logoutConfirmation, setLogoutConfirmation] = useState<'current' | 'all' | null>(null);
  const [unlinkGoogleConfirmation, setUnlinkGoogleConfirmation] = useState(false);

  const { profile, isLoading, isError, refetch } = useProfile();
  const { logout, logoutAll, isPending: isLoggingOut } = useLogout();
  const {
    link: linkGoogle,
    unlink: unlinkGoogle,
    isReady: isGoogleReady,
    isPending: isGooglePending,
    error: googleError,
  } = useGoogleAccountLink();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

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
          <Ionicons name="alert-circle-outline" size={56} color={theme.error} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Không thể tải hồ sơ</Text>
          <Text style={[styles.errorDesc, { color: theme.textSecondary }]}>
            Đã có lỗi xảy ra khi tải thông tin. Vui lòng thử lại.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const roleColor = ROLE_COLOR[profile.role];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Hồ sơ" subtitle="Thông tin cá nhân và bảo mật" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer style={styles.responsiveContent}>
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
            <Text style={[styles.email, { color: theme.textSecondary }]}>
              {profile.email ?? profile.phone ?? 'Chưa có thông tin đăng nhập'}
            </Text>
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
          {profile.date_of_birth && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Ngày sinh</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDob(profile.date_of_birth)}
              </Text>
            </View>
          )}
          {profile.gender && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Giới tính</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {GENDER_LABEL[profile.gender] ?? profile.gender}
              </Text>
            </View>
          )}
          {profile.hometown && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Quê quán</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{profile.hometown}</Text>
            </View>
          )}
          {profile.address && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Địa chỉ</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{profile.address}</Text>
            </View>
          )}

          {profile.locked_until && new Date(profile.locked_until) > new Date() && (
            <View
              style={[
                styles.lockedBanner,
                { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={16} color={theme.error} />
              <Text style={[styles.lockedText, { color: theme.error }]}>
                Tài khoản tạm khóa đến{' '}
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
            icon="business-outline"
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
            icon="swap-horizontal-outline"
            label="Chuyển đổi công ty"
            sublabel="Đổi công ty đang thao tác — không cần đăng xuất"
            onPress={() => router.push('/(auth)/select-tenant' as never)}
            theme={theme}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Bảo mật</Text>

          <ProfileSettingsRow
            icon="create-outline"
            label="Chỉnh sửa hồ sơ"
            sublabel="Tên, ảnh đại diện và thông tin cá nhân"
            onPress={() => setEditProfileVisible(true)}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="mail-outline"
            label="Email"
            sublabel={`${profile.email ?? 'Chưa thiết lập'} · ${profile.email_verified ? 'Đã xác minh' : 'Chưa xác minh'}`}
            onPress={() => setIdentifierMethod('email')}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="call-outline"
            label="Số điện thoại"
            sublabel={`${profile.phone ?? 'Chưa thiết lập'} · ${profile.phone_verified ? 'Đã xác minh' : 'Chưa xác minh'}`}
            onPress={() => setIdentifierMethod('phone')}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            onPress={() => setChangePasswordVisible(true)}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon={profile.is_2fa_enabled ? 'shield-checkmark-outline' : 'shield-outline'}
            label={profile.is_2fa_enabled ? 'Xác thực 2 lớp · Đang bật' : 'Bật xác thực 2 lớp'}
            sublabel={
              profile.is_2fa_enabled
                ? 'Nhấn để tắt 2FA'
                : 'Tăng cường bảo mật tài khoản'
            }
            onPress={() => setTwoFAVisible(true)}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon={profile.google_linked ? 'logo-google' : 'link-outline'}
            label={profile.google_linked ? 'Google · Đã liên kết' : 'Liên kết tài khoản Google'}
            sublabel={
              profile.google_linked
                ? 'Nhấn để gỡ liên kết'
                : isGoogleReady
                  ? 'Đăng nhập nhanh và đồng bộ theo email'
                  : 'Google Sign-In chưa sẵn sàng'
            }
            onPress={() => {
              if (profile.google_linked) setUnlinkGoogleConfirmation(true);
              else linkGoogle();
            }}
            loading={isGooglePending}
            theme={theme}
          />
          {googleError && (
            <Text style={[styles.googleError, { color: theme.error }]}>{googleError}</Text>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Tài khoản</Text>

          <ProfileSettingsRow
            icon="log-out-outline"
            label="Đăng xuất"
            sublabel="Thiết bị hiện tại"
            onPress={() => setLogoutConfirmation('current')}
            destructive
            loading={isLoggingOut}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="phone-portrait-outline"
            label="Thiết bị đang đăng nhập"
            sublabel="Xem và thu hồi từng phiên đăng nhập"
            onPress={() => router.push('/sessions' as never)}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          <ProfileSettingsRow
            icon="trash-outline"
            label="Đăng xuất tất cả thiết bị"
            sublabel="Thu hồi mọi phiên đang hoạt động"
            onPress={() => setLogoutConfirmation('all')}
            destructive
            loading={isLoggingOut}
            theme={theme}
          />
        </View>

        <Text style={[styles.footer, { color: theme.textMuted }]}>FAMS · v1.0.0</Text>
        </ResponsiveContainer>
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

      <AccountIdentifierModal
        visible={identifierMethod !== null}
        method={identifierMethod ?? 'email'}
        profile={profile}
        onClose={() => setIdentifierMethod(null)}
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

      <ConfirmDialog
        visible={logoutConfirmation !== null}
        title={logoutConfirmation === 'all' ? 'Đăng xuất tất cả thiết bị?' : 'Đăng xuất khỏi thiết bị này?'}
        description={
          logoutConfirmation === 'all'
            ? 'Mọi phiên đăng nhập đang hoạt động sẽ bị thu hồi và cần đăng nhập lại.'
            : 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng FAMS trên thiết bị này.'
        }
        confirmLabel={logoutConfirmation === 'all' ? 'Đăng xuất tất cả' : 'Đăng xuất'}
        destructive
        loading={isLoggingOut}
        onCancel={() => setLogoutConfirmation(null)}
        onConfirm={() => {
          if (logoutConfirmation === 'all') logoutAll();
          else logout();
        }}
      />

      <ConfirmDialog
        visible={unlinkGoogleConfirmation}
        title="Gỡ liên kết Google?"
        description="Bạn sẽ không thể đăng nhập bằng Google cho đến khi liên kết lại. Tài khoản cần có mật khẩu để thực hiện thao tác này."
        confirmLabel="Gỡ liên kết"
        destructive
        loading={isGooglePending}
        onCancel={() => setUnlinkGoogleConfirmation(false)}
        onConfirm={() => {
          unlinkGoogle();
          setUnlinkGoogleConfirmation(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32 },
  responsiveContent: { gap: 16 },
  identityCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...shadows.card,
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
    ...shadows.card,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  lockedText: { flex: 1, fontSize: 13, fontWeight: '500' },
  sectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.card,
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
  googleError: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    fontSize: 12,
    lineHeight: 18,
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
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 12 },
});
