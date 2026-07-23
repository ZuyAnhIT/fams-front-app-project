import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { useProfile } from '@/features/auth/hooks/use-profile';
import { useAvailableSites } from '@/features/checkin/hooks/use-available-sites';
import { useUnreadCount } from '@/features/notification/hooks/useUnreadCount';
import { palette, radius, shadows, spacing } from '@/theme/tokens';

interface QuickAction {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatToday(): string {
  const text = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function HomeScreen() {
  const {
    profile,
    isLoading: isLoadingProfile,
    isRefetching: isRefetchingProfile,
    refetch: refetchProfile,
  } = useProfile();
  const {
    sites,
    isLoading: isLoadingSites,
    isRefetching: isRefetchingSites,
    isError: isSitesError,
    refetch: refetchSites,
  } = useAvailableSites();
  const { unreadCount } = useUnreadCount();

  const firstSite = sites[0];
  const displayName = profile?.full_name?.trim() || 'bạn';
  const firstName = displayName.split(/\s+/).at(-1) ?? displayName;
  const initial = displayName.charAt(0).toUpperCase();

  const quickActions: QuickAction[] = [
    {
      label: 'Chấm công',
      description: 'Bắt đầu hoặc kết thúc ca',
      icon: 'finger-print-outline',
      route: '/(tabs)/checkin',
    },
    {
      label: 'Lịch sử',
      description: 'Xem các lần chấm công',
      icon: 'time-outline',
      route: '/(tabs)/checkin-history',
    },
    {
      label: 'Phân công',
      description: 'Ca và công trình làm việc',
      icon: 'clipboard-outline',
      route: '/(tabs)/assignment',
    },
    {
      label: 'Thông báo',
      description: unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới',
      icon: 'notifications-outline',
      route: '/(tabs)/notifications',
      badge: unreadCount,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingProfile || isRefetchingSites}
            onRefresh={() => {
              refetchProfile();
              refetchSites();
            }}
            tintColor={palette.primary}
          />
        }
      >
        <ResponsiveContainer>
          <View style={styles.profileHeader}>
            <View style={styles.profileCopy}>
              <Text style={styles.eyebrow}>{greeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
              <Text style={styles.date}>{formatToday()}</Text>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Mở hồ sơ cá nhân"
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
              ) : (
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.shiftCard}>
            <View style={styles.shiftHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>CA LÀM HÔM NAY</Text>
                <Text style={styles.shiftTitle}>
                  {isLoadingSites
                    ? 'Đang kiểm tra lịch làm việc'
                    : firstSite?.shift?.name ?? (sites.length > 0 ? 'Ca làm được phân công' : 'Chưa có ca làm')}
                </Text>
              </View>
              <View style={styles.calendarIcon}>
                <Ionicons name="calendar-outline" size={24} color={palette.primary} />
              </View>
            </View>

            {isLoadingSites ? (
              <ActivityIndicator style={styles.shiftLoader} color={palette.primary} />
            ) : isSitesError ? (
              <Text style={styles.mutedText}>Không thể tải lịch làm việc. Kéo xuống để thử lại.</Text>
            ) : firstSite ? (
              <View style={styles.shiftDetails}>
                <View style={styles.detailLine}>
                  <Ionicons name="business-outline" size={17} color={palette.textMuted} />
                  <Text style={styles.detailText} numberOfLines={1}>{firstSite.site.name}</Text>
                </View>
                {firstSite.shift && (
                  <View style={styles.detailLine}>
                    <Ionicons name="time-outline" size={17} color={palette.textMuted} />
                    <Text style={styles.detailText}>
                      {firstSite.shift.startTime} – {firstSite.shift.endTime}
                    </Text>
                  </View>
                )}
                {sites.length > 1 && (
                  <Text style={styles.additionalSites}>+{sites.length - 1} công trình khác được phép chấm công</Text>
                )}
              </View>
            ) : (
              <Text style={styles.mutedText}>Bạn chưa được phân công công trình hoặc ca làm hôm nay.</Text>
            )}

            <Pressable
              onPress={() => router.push('/(tabs)/checkin')}
              style={({ pressed }) => [styles.shiftAction, pressed && styles.shiftActionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Mở màn hình chấm công"
            >
              <Text style={styles.shiftActionText}>Mở chấm công</Text>
              <Ionicons name="arrow-forward" size={18} color={palette.white} />
            </Pressable>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
            <Text style={styles.sectionSubtitle}>Các tác vụ thường dùng trong ngày</Text>
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as never)}
                style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityHint={action.description}
              >
                <View style={styles.quickIconWrap}>
                  <Ionicons name={action.icon} size={23} color={palette.primary} />
                  {!!action.badge && action.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{action.badge > 99 ? '99+' : action.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickTitle}>{action.label}</Text>
                <Text style={styles.quickDescription} numberOfLines={2}>{action.description}</Text>
              </Pressable>
            ))}
          </View>

          {!isLoadingProfile && profile?.department && (
            <View style={styles.departmentBanner}>
              <Ionicons name="people-outline" size={20} color={palette.textSecondary} />
              <View style={styles.departmentCopy}>
                <Text style={styles.departmentLabel}>Đơn vị công tác</Text>
                <Text style={styles.departmentValue}>{profile.department}</Text>
              </View>
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileCopy: { flex: 1, paddingRight: spacing.lg },
  eyebrow: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
  name: { color: palette.text, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  date: { color: palette.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarInitial: { color: palette.primary, fontSize: 21, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  shiftCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  sectionEyebrow: { color: palette.primary, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 0.8 },
  shiftTitle: { color: palette.text, fontSize: 19, lineHeight: 26, fontWeight: '800', marginTop: 4 },
  calendarIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftLoader: { alignSelf: 'flex-start', marginTop: spacing.xl },
  shiftDetails: { gap: spacing.sm, marginTop: spacing.lg },
  detailLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { flex: 1, color: palette.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  additionalSites: { color: palette.primary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  mutedText: { color: palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.lg },
  shiftAction: {
    marginTop: spacing.xl,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  shiftActionPressed: { backgroundColor: palette.primaryPressed },
  shiftActionText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  sectionHeading: { marginTop: spacing.xxl, marginBottom: spacing.md },
  sectionTitle: { color: palette.text, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  sectionSubtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 145,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  quickCardPressed: { backgroundColor: palette.surfaceBrand, borderColor: palette.primarySoft },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: palette.white, fontSize: 9, fontWeight: '800' },
  quickTitle: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  quickDescription: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  departmentBanner: {
    marginTop: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  departmentCopy: { flex: 1 },
  departmentLabel: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  departmentValue: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
});
