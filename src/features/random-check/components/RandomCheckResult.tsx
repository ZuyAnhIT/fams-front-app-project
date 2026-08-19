import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { palette, radius, shadows, spacing } from '@/theme/tokens';

import { useMyRandomCheckResult } from '../hooks/use-random-check';
import type { RandomCheckMode } from '../types/random-check.type';
import {
  RANDOM_CHECK_MODE_LABELS,
  randomCheckFailureLabel,
  randomCheckRequiresFace,
  randomCheckRequiresLiveness,
} from '../utils/random-check.utils';

export interface RandomCheckResultProps {
  checkId: string;
  mode: RandomCheckMode;
  outcome: 'pass' | 'fail';
  failureReason: string | null;
  locationVerified: boolean;
  faceVerified: boolean | null;
  livenessVerified: boolean | null;
  score: number | null;
  hasPhotoEvidence: boolean;
  processing: boolean;
}

function ResultRow({ label, value, state }: { label: string; value: string; state: 'pass' | 'fail' | 'pending' }) {
  const tone = state === 'pass' ? palette.success : state === 'fail' ? palette.danger : palette.warning;
  const icon = state === 'pass' ? 'checkmark-circle' : state === 'fail' ? 'close-circle' : 'time';
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={21} color={tone} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

export function RandomCheckResult(props: RandomCheckResultProps) {
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const resultQuery = useMyRandomCheckResult(
    props.checkId,
    props.processing && !pollingTimedOut,
  );
  const queryClient = useQueryClient();
  const serverResult = resultQuery.data;
  const processing = props.processing && serverResult?.processingStatus !== 'completed';
  const outcome = serverResult?.outcome ?? props.outcome;
  const locationVerified = serverResult?.locationVerified ?? props.locationVerified;
  const faceVerified = serverResult ? serverResult.faceVerified : props.faceVerified;
  const livenessVerified = serverResult ? serverResult.livenessVerified : props.livenessVerified;
  const score = serverResult?.faceVerifyScore ?? props.score;
  const failureReason = serverResult?.failureReason ?? props.failureReason;

  useEffect(() => {
    if (!processing || pollingTimedOut) return;
    const timer = setTimeout(() => setPollingTimedOut(true), 60_000);
    return () => clearTimeout(timer);
  }, [pollAttempt, pollingTimedOut, processing]);

  useEffect(() => {
    if (serverResult?.processingStatus === 'completed') {
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    }
  }, [queryClient, serverResult?.processingStatus]);

  const retryPolling = () => {
    setPollingTimedOut(false);
    setPollAttempt((value) => value + 1);
    void resultQuery.refetch();
  };

  const finalPass = !processing && outcome === 'pass';
  const tone = processing ? palette.warning : finalPass ? palette.success : palette.danger;
  const title = pollingTimedOut && processing
    ? 'Chưa nhận được kết quả cuối'
    : processing
      ? 'Đang xác minh bằng chứng'
      : finalPass
        ? 'Kiểm tra đạt yêu cầu'
        : 'Kiểm tra chưa đạt';
  const description = pollingTimedOut && processing
    ? 'Máy chủ đã nhận phản hồi nhưng AI chưa trả kết quả trong 60 giây. Bạn không cần gửi lại; có thể thử kiểm tra kết quả thêm lần nữa hoặc liên hệ quản lý.'
    : processing
    ? 'Máy chủ đã nhận GPS và ảnh. AI đang xác minh khuôn mặt/người thật; trạng thái này chưa phải kết quả cuối.'
    : finalPass
      ? 'Phản hồi đã được ghi nhận hợp lệ theo policy công ty.'
      : randomCheckFailureLabel(failureReason);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ResponsiveContainer>
          <View style={styles.card}>
            <View style={[styles.heroIcon, { backgroundColor: processing ? palette.warningSoft : finalPass ? palette.successSoft : palette.dangerSoft }]}> 
              <Ionicons name={processing ? 'hourglass-outline' : finalPass ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={42} color={tone} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <View style={styles.modePill}><Text style={styles.modeText}>{RANDOM_CHECK_MODE_LABELS[props.mode]}</Text></View>

            <View style={styles.results}>
              <ResultRow label="Vị trí" value={locationVerified ? 'Đạt' : 'Không đạt'} state={locationVerified ? 'pass' : 'fail'} />
              {randomCheckRequiresFace(props.mode) && (
                <ResultRow label="Khuôn mặt" value={faceVerified === null ? 'Đang xác minh' : faceVerified ? 'Đạt' : 'Không đạt'} state={faceVerified === null ? 'pending' : faceVerified ? 'pass' : 'fail'} />
              )}
              {randomCheckRequiresLiveness(props.mode) && (
                <ResultRow label="Người thật" value={livenessVerified === null ? 'Đang xác minh' : livenessVerified ? 'Đạt' : 'Không đạt'} state={livenessVerified === null ? 'pending' : livenessVerified ? 'pass' : 'fail'} />
              )}
              {score !== null && <ResultRow label="Độ tương đồng" value={`${Math.round(score * 100)}%`} state={faceVerified ? 'pass' : 'fail'} />}
              {props.hasPhotoEvidence && (
                <ResultRow label="Ảnh bằng chứng" value="Đã tiếp nhận" state="pass" />
              )}
            </View>

            {processing && !pollingTimedOut && (
              <View style={styles.notice} accessibilityRole="alert">
                <Ionicons name="information-circle-outline" size={21} color={palette.primary} />
                <Text style={styles.noticeText}>Bạn đã phản hồi đúng hạn. Ứng dụng đang tự kiểm tra kết quả mỗi 4 giây; vui lòng giữ màn hình này mở.</Text>
              </View>
            )}

            {pollingTimedOut && processing && (
              <Pressable onPress={retryPolling} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]} accessibilityRole="button">
                <Ionicons name="refresh" size={18} color={palette.primary} />
                <Text style={styles.retryText}>Thử lấy kết quả lại</Text>
              </Pressable>
            )}

            <Pressable onPress={() => router.replace('/(tabs)/random-check')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.primaryText}>Về danh sách kiểm tra</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/(tabs)/attendance')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.secondaryText}>Mở bảng công</Text>
            </Pressable>
            {/* #129 (2026-08-18): a failed check with no clear self-recovery path (not a
                transient processing state) should offer a direct way to reach HR, not just
                the failure label — previously there was no action here at all. */}
            {!processing && !finalPass && (
              <Pressable onPress={() => router.push('/help' as never)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.secondaryText}>Liên hệ HR</Text>
              </Pressable>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: palette.surface, borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', ...shadows.card },
  heroIcon: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.text, fontSize: 23, lineHeight: 30, fontWeight: '900', textAlign: 'center', marginTop: spacing.lg },
  description: { color: palette.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  modePill: { backgroundColor: palette.surfaceBrand, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.lg },
  modeText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  results: { width: '100%', marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: palette.border },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  rowLabel: { flex: 1, color: palette.textSecondary, fontSize: 13 },
  rowValue: { fontSize: 12, fontWeight: '800' },
  notice: { width: '100%', flexDirection: 'row', gap: spacing.sm, backgroundColor: palette.surfaceBrand, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  noticeText: { flex: 1, color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  retryButton: { width: '100%', minHeight: 48, marginTop: spacing.lg, borderWidth: 1, borderColor: palette.primary, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  retryText: { color: palette.primary, fontSize: 13, fontWeight: '800' },
  primaryButton: { width: '100%', minHeight: 50, borderRadius: radius.md, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  primaryText: { color: palette.white, fontSize: 14, fontWeight: '800' },
  secondaryButton: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: palette.primary, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
