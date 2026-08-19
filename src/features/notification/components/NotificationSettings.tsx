import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, radius, shadows, spacing } from '@/theme/tokens';

import { useNotificationSettings, useUpdateNotificationSetting } from '../hooks/useNotificationSettings';

function customEventLabel(eventType: string): string {
  // Backend intentionally returns label=null for tenant-defined event types.
  // Showing the raw identifier is safer than inventing a potentially incorrect label.
  return eventType;
}

export function NotificationSettings() {
  const query = useNotificationSettings();
  const mutation = useUpdateNotificationSetting();

  if (query.isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /><Text style={styles.muted}>Đang tải cài đặt...</Text></View>;
  }
  if (query.isError) {
    return <FeedbackState icon="cloud-offline-outline" title="Không thể tải cài đặt thông báo" description="Kiểm tra kết nối rồi thử lại." actionLabel="Thử lại" onAction={() => void query.refetch()} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.note}>
        <Text style={styles.noteTitle}>Hai kênh hoạt động độc lập</Text>
        <Text style={styles.noteText}>Tắt thông báo trong App không tự tắt push, và ngược lại. Trạng thái ban đầu do chính sách mặc định của hệ thống quyết định.</Text>
      </View>
      {(query.data ?? []).map((setting) => {
        const pending = mutation.isPending && mutation.variables?.eventType === setting.eventType;
        const update = (request: { inAppEnabled: boolean; pushEnabled: boolean }) => mutation.mutate({ eventType: setting.eventType, request });
        return (
          <View key={setting.eventType} style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{setting.label ?? customEventLabel(setting.eventType)}</Text>
              {setting.mandatory && <Ionicons name="lock-closed" size={14} color={palette.textMuted} />}
            </View>
            <Text style={styles.description}>
              {setting.mandatory
                ? 'Thông báo bắt buộc — không thể tắt.'
                : setting.label
                  ? 'Chọn cách bạn muốn nhận loại thông báo này.'
                  : `Loại thông báo riêng của công ty (${setting.eventType}).`}
            </Text>
            <View style={styles.row}>
              <View style={styles.rowCopy}><Text style={styles.rowTitle}>Trong ứng dụng</Text><Text style={styles.rowHint}>Hiện trong hộp thư FAMS</Text></View>
              <Switch value={setting.inAppEnabled} disabled={pending || setting.mandatory} onValueChange={(value) => update({ inAppEnabled: value, pushEnabled: setting.pushEnabled })} trackColor={{ false: '#CBD5E1', true: '#93C5FD' }} thumbColor={setting.inAppEnabled ? palette.primary : '#F8FAFC'} />
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <View style={styles.rowCopy}><Text style={styles.rowTitle}>Push trên thiết bị</Text><Text style={styles.rowHint}>Hiện ngay cả khi App đang đóng</Text></View>
              {pending ? <ActivityIndicator color={palette.primary} /> : <Switch value={setting.pushEnabled} disabled={setting.mandatory} onValueChange={(value) => update({ inAppEnabled: setting.inAppEnabled, pushEnabled: value })} trackColor={{ false: '#CBD5E1', true: '#93C5FD' }} thumbColor={setting.pushEnabled ? palette.primary : '#F8FAFC'} />}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  muted: { color: palette.textMuted },
  note: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: palette.primarySoft },
  noteTitle: { color: palette.primary, fontSize: 14, fontWeight: '800' },
  noteText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  card: { backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, ...shadows.card },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: palette.text, fontSize: 16, fontWeight: '800' },
  description: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: spacing.md },
  rowCopy: { flex: 1 },
  rowTitle: { color: palette.text, fontSize: 14, fontWeight: '700' },
  rowHint: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
});
