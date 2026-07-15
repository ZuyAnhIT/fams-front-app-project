import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAvailableSites } from '../hooks/use-available-sites';
import { useCheckinSubmit } from '../hooks/use-checkin-submit';
import { useCheckoutSubmit } from '../hooks/use-checkout-submit';
import { useCheckinStore } from '../store/checkin.store';
import type { AvailableSite } from '../types/checkin.type';

/** Màn hình chấm công chính: chọn site (US1), check-in (US2/US3), check-out (US4/US5). */
export function CheckinHome() {
  const router = useRouter();
  const { sites, isLoading, isError, isForbidden, refetch } = useAvailableSites();
  const { checkIn, isLocating: isLocatingIn, isSubmitting: isSubmittingIn, locationErrorMessage: errIn } =
    useCheckinSubmit();
  const {
    checkOut,
    isLocating: isLocatingOut,
    isResolvingOpenCheckin,
    isSubmitting: isSubmittingOut,
    locationErrorMessage: errOut,
    openCheckinId,
  } = useCheckoutSubmit();

  const hydrate = useCheckinStore((s) => s.hydrate);
  const isHydrating = useCheckinStore((s) => s.isHydrating);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (sites.length === 1 && !selectedSiteId) {
      setSelectedSiteId(sites[0].site.id);
    }
  }, [sites, selectedSiteId]);

  const hasOpenShift = !!openCheckinId;

  const goToResult = (checkinId: string) => {
    router.push({ pathname: '/modal/checkin-result', params: { checkinId } } as unknown as Parameters<
      typeof router.push
    >[0]);
  };

  const handleCheckin = async () => {
    if (!selectedSiteId) return;
    const result = await checkIn(selectedSiteId);
    if (result) goToResult(result.id);
  };

  const handleCheckout = async () => {
    const result = await checkOut();
    if (result) goToResult(result.id);
  };

  if (isHydrating || isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (isForbidden) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <Text style={styles.errorIcon}>🔒</Text>
        <Text style={styles.errorTitle}>Bạn không có quyền chấm công.</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Không thể tải danh sách site được phép check-in.</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Chấm công</Text>

        {hasOpenShift && (
          <View style={styles.openBanner}>
            <Text style={styles.openBannerText}>Bạn đang có ca làm việc chưa check-out.</Text>
          </View>
        )}

        {sites.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>Không có site nào được phép check-in hôm nay</Text>
          </View>
        ) : (
          <View style={styles.siteList}>
            {sites.map((item: AvailableSite) => {
              const active = selectedSiteId === item.site.id;
              return (
                <Pressable
                  key={item.assignmentId}
                  onPress={() => setSelectedSiteId(item.site.id)}
                  style={[styles.siteCard, active && styles.siteCardActive]}
                >
                  <Text style={styles.siteName}>{item.site.name}</Text>
                  {item.site.address && <Text style={styles.siteAddress}>{item.site.address}</Text>}
                  {item.shift && (
                    <Text style={styles.siteShift}>
                      Ca: {item.shift.name} ({item.shift.startTime}–{item.shift.endTime})
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {(errIn || errOut) && <Text style={styles.errorText}>{errIn ?? errOut}</Text>}

        <Pressable
          disabled={!selectedSiteId || isLocatingIn || isSubmittingIn || hasOpenShift}
          onPress={handleCheckin}
          style={[
            styles.actionButton,
            styles.checkinButton,
            (!selectedSiteId || hasOpenShift) && styles.actionButtonDisabled,
          ]}
        >
          {isLocatingIn || isSubmittingIn ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>CHECK IN</Text>
          )}
        </Pressable>

        <Pressable
          disabled={isLocatingOut || isResolvingOpenCheckin || isSubmittingOut}
          onPress={handleCheckout}
          style={[styles.actionButton, styles.checkoutButton]}
        >
          {isLocatingOut || isResolvingOpenCheckin || isSubmittingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>CHECK OUT</Text>
          )}
        </Pressable>

        <Pressable style={styles.historyLink} onPress={() => router.push('/(tabs)/checkin-history' as never)}>
          <Text style={styles.historyLinkText}>Xem lịch sử chấm công</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  openBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
  },
  openBannerText: { color: '#92400E', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 32, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  siteList: { gap: 10 },
  siteCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 4,
  },
  siteCardActive: { borderColor: '#2563EB', borderWidth: 2, backgroundColor: '#EFF6FF' },
  siteName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  siteAddress: { fontSize: 13, color: '#64748B' },
  siteShift: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinButton: { backgroundColor: '#2563EB' },
  checkoutButton: { backgroundColor: '#0F172A' },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  historyLink: { alignItems: 'center', paddingVertical: 8 },
  historyLinkText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
});
