import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { palette, radius, spacing } from '@/theme/tokens';

import { useCheckinExplain } from '../hooks/use-checkin-explain';
import { useCheckinResult } from '../hooks/use-checkin-result';
import type { CheckinStatus } from '../types/checkin.type';
import { CHECKIN_STATUS_COLORS, CHECKIN_STATUS_LABELS, formatWorkMinutes } from '../utils/checkin.mapper';

interface CheckinResultProps {
  checkinId: string;
}

const STATUS_META: Record<CheckinStatus, { icon: keyof typeof Ionicons.glyphMap; background: string }> = {
  valid: { icon: 'checkmark-circle-outline', background: palette.successSoft },
  pending_review: { icon: 'time-outline', background: palette.warningSoft },
  rejected: { icon: 'alert-circle-outline', background: palette.dangerSoft },
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color={palette.textMuted} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

/** Result modal for a completed check-in/out action. */
export function CheckinResult({ checkinId }: CheckinResultProps) {
  const { result, isLoading, isError, refetch } = useCheckinResult(checkinId);
  const { submitExplanation, isSubmitting } = useCheckinExplain(checkinId);
  const [showExplainForm, setShowExplainForm] = useState(false);
  const [note, setNote] = useState('');

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/checkin');
  };

  const handleSubmitExplain = async () => {
    const normalizedNote = note.trim();
    if (!normalizedNote) return;
    await submitExplanation({ note: normalizedNote });
    setShowExplainForm(false);
    setNote('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader title="Kết quả chấm công" onClose={close} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Đang tải kết quả...</Text>
        </View>
      ) : isError || !result ? (
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể tải kết quả chấm công"
          description="Kết quả đã được lưu trên hệ thống nếu thao tác trước đó thành công."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={60}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ResponsiveContainer>
              <View style={styles.resultCard}>
                <View style={[styles.statusIcon, { backgroundColor: STATUS_META[result.status].background }]}>
                  <Ionicons
                    name={STATUS_META[result.status].icon}
                    size={42}
                    color={CHECKIN_STATUS_COLORS[result.status]}
                  />
                </View>
                <Text style={[styles.statusText, { color: CHECKIN_STATUS_COLORS[result.status] }]}>
                  {CHECKIN_STATUS_LABELS[result.status]}
                </Text>
                <Text style={styles.message}>{result.message}</Text>

                <View style={styles.divider} />

                <View style={styles.details}>
                  <DetailRow icon="enter-outline" label="Thời gian vào ca" value={formatDateTime(result.checkInAt)} />
                  {result.checkOutAt && (
                    <DetailRow icon="exit-outline" label="Thời gian ra ca" value={formatDateTime(result.checkOutAt)} />
                  )}
                  {result.workMinutes !== null && (
                    <DetailRow icon="hourglass-outline" label="Tổng thời gian làm việc" value={formatWorkMinutes(result.workMinutes)} />
                  )}
                  <DetailRow
                    icon="location-outline"
                    label="Xác thực vị trí vào ca"
                    value={result.checkInInsideGeofence ? 'Trong phạm vi cho phép' : 'Ngoài phạm vi cho phép'}
                  />
                </View>
              </View>

              {result.status !== 'valid' && (
                <View style={styles.explanationCard}>
                  <View style={styles.explanationHeader}>
                    <View style={styles.explanationIcon}>
                      <Ionicons name="chatbox-ellipses-outline" size={21} color={palette.warning} />
                    </View>
                    <View style={styles.explanationCopy}>
                      <Text style={styles.explanationTitle}>Cần bổ sung thông tin?</Text>
                      <Text style={styles.explanationDescription}>
                        Gửi lý do để quản lý có thêm thông tin khi xem xét bản ghi này.
                      </Text>
                    </View>
                  </View>

                  {showExplainForm ? (
                    <View style={styles.explainForm}>
                      <Text style={styles.inputLabel}>Nội dung giải trình</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Mô tả ngắn gọn lý do chấm công bất thường..."
                        placeholderTextColor={palette.textMuted}
                        value={note}
                        onChangeText={setNote}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                        accessibilityLabel="Nội dung giải trình"
                      />
                      <Text style={styles.characterCount}>{note.length}/500</Text>
                      <View style={styles.formActions}>
                        <AppButton
                          label="Huỷ"
                          variant="secondary"
                          onPress={() => {
                            setShowExplainForm(false);
                            setNote('');
                          }}
                          style={styles.formButton}
                        />
                        <AppButton
                          label="Gửi giải trình"
                          onPress={handleSubmitExplain}
                          disabled={!note.trim()}
                          loading={isSubmitting}
                          style={styles.formButton}
                        />
                      </View>
                    </View>
                  ) : (
                    <AppButton
                      label="Viết giải trình"
                      variant="secondary"
                      icon="create-outline"
                      onPress={() => setShowExplainForm(true)}
                    />
                  )}
                </View>
              )}

              <AppButton label="Đóng" variant="ghost" onPress={close} style={styles.closeButton} />
            </ResponsiveContainer>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { color: palette.textMuted, fontSize: 14 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  resultCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  statusIcon: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 22, lineHeight: 29, fontWeight: '800', textAlign: 'center', marginTop: spacing.md },
  message: { color: palette.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 4, maxWidth: 480 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, width: '100%', marginVertical: spacing.xl },
  details: { width: '100%', gap: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: { flex: 1 },
  detailLabel: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  detailValue: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 2 },
  explanationCard: {
    marginTop: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  explanationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  explanationIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: palette.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationCopy: { flex: 1 },
  explanationTitle: { color: palette.text, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  explanationDescription: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  explainForm: { gap: spacing.sm },
  inputLabel: { color: palette.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  textInput: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    color: palette.text,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  characterCount: { color: palette.textMuted, fontSize: 11, textAlign: 'right' },
  formActions: { flexDirection: 'row', gap: spacing.sm },
  formButton: { flex: 1 },
  closeButton: { marginTop: spacing.md },
});
