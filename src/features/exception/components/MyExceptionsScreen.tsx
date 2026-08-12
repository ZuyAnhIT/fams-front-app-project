import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { FeedbackState } from '@/components/ui/feedback-state';
import { palette, radius, spacing } from '@/theme/tokens';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';

import { useMyExceptions, useSubmitExceptionExplanation } from '../hooks/use-my-exceptions';
import type { MyExceptionItem } from '../types/exception.type';

const REASON_LABELS: Record<string, string> = {
  pending_review: 'Chấm công chờ duyệt',
  no_response: 'Không phản hồi kiểm tra',
  location_fail: 'Vị trí không đạt',
  face_fail: 'Face ID không đạt',
  liveness_fail: 'Xác thực người thật không đạt',
  face_verify_timeout: 'AI xác thực quá hạn',
};

export function MyExceptionsScreen() {
  const { formatDate } = useTenantPreferences();
  const query = useMyExceptions();
  const explanation = useSubmitExceptionExplanation();
  const [selected, setSelected] = useState<MyExceptionItem | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);

  const close = () => {
    if (explanation.isSubmitting) return;
    setSelected(null);
    setNote('');
    setPhoto(null);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập ảnh', 'Hãy cho phép truy cập thư viện để đính kèm ảnh giải trình.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Ảnh quá lớn', 'Ảnh giải trình không được vượt quá 5MB.');
      return;
    }
    setPhoto({
      uri: asset.uri,
      name: asset.fileName || 'explanation.jpg',
      type: asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)
        ? asset.mimeType
        : 'image/jpeg',
    });
  };

  const submit = async () => {
    const normalized = note.trim();
    if (!selected || !normalized) return;
    try {
      await explanation.submit({ item: selected, payload: { note: normalized, photo: photo || undefined } });
      close();
    } catch {
      // The hook shows the backend business error and keeps the form open.
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <AppHeader
        title="Cần giải thích"
        subtitle={`${query.items.length} mục đang cần theo dõi`}
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')}
      />

      {query.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.muted}>Đang tải hộp thư...</Text>
        </View>
      ) : query.isError ? (
        <FeedbackState
          icon="cloud-offline-outline"
          title="Không thể tải các mục cần giải thích"
          description="Kiểm tra kết nối hoặc công ty đang chọn rồi thử lại."
          actionLabel="Thử lại"
          onAction={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={query.items}
          keyExtractor={(item) => `${item.sourceType}:${item.id}`}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={palette.primary} />}
          contentContainerStyle={[styles.list, query.items.length === 0 && styles.emptyList]}
          ListHeaderComponent={query.items.length > 0 ? (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={21} color={palette.primary} />
              <Text style={styles.infoText}>Giải trình cung cấp thêm bối cảnh cho HR; gửi giải trình không tự động thay đổi kết quả hoặc xóa vi phạm.</Text>
            </View>
          ) : null}
          ListEmptyComponent={(
            <FeedbackState
              icon="checkmark-done-circle-outline"
              title="Không có mục cần giải thích"
              description="Các chấm công chờ duyệt hoặc vi phạm chưa xử lý sẽ xuất hiện tại đây."
            />
          )}
          renderItem={({ item }) => {
            const isViolation = item.sourceType === 'violation';
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.icon, { backgroundColor: isViolation ? palette.dangerSoft : palette.warningSoft }]}>
                    <Ionicons name={isViolation ? 'warning-outline' : 'location-outline'} size={22} color={isViolation ? palette.danger : palette.warning} />
                  </View>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardTitle}>{REASON_LABELS[item.reasonType] ?? item.reasonType}</Text>
                    <Text style={styles.cardDate}>{item.date ? formatDate(item.date) : 'Không rõ ngày'}</Text>
                  </View>
                  <View style={styles.sourceBadge}>
                    <Text style={styles.sourceText}>{isViolation ? 'Vi phạm' : 'Chấm công'}</Text>
                  </View>
                </View>
                <Text style={styles.description}>{item.description || 'Hệ thống cần bạn cung cấp thêm thông tin.'}</Text>
                {item.hasExplanation ? (
                  <View style={styles.waitingBadge}>
                    <Ionicons name="time-outline" size={15} color={palette.primary} />
                    <Text style={styles.waitingText}>Đã giải trình · đang chờ HR xử lý</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => { setSelected(item); setNote(item.employeeNote || ''); setPhoto(null); }}
                  style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.hasExplanation ? 'Cập nhật giải trình' : 'Giải thích'} ${REASON_LABELS[item.reasonType] ?? item.reasonType}`}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={18} color={palette.white} />
                  <Text style={styles.actionText}>{item.hasExplanation ? 'Cập nhật giải trình' : 'Gửi giải trình'}</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Đóng biểu mẫu" />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selected?.hasExplanation ? 'Cập nhật giải trình' : 'Gửi giải trình'}</Text>
            <Text style={styles.sheetSubtitle}>{selected ? REASON_LABELS[selected.reasonType] ?? selected.reasonType : ''}</Text>
            {selected?.hasExplanation ? <Text style={styles.waitingHint}>HR chưa xử lý mục này. Bạn có thể sửa nội dung hoặc thay ảnh bằng chứng.</Text> : null}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Mô tả sự việc, nguyên nhân và thông tin HR cần biết..."
              placeholderTextColor={palette.textMuted}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              editable={!explanation.isSubmitting}
              style={styles.input}
              accessibilityLabel="Nội dung giải trình"
            />
            <Text style={styles.counter}>{note.length}/1000</Text>
            <Pressable
              disabled={explanation.isSubmitting}
              onPress={() => photo ? setPhoto(null) : void pickPhoto()}
              style={({ pressed }) => [styles.photoButton, pressed && styles.actionPressed]}
              accessibilityRole="button"
              accessibilityLabel={photo ? 'Xóa ảnh giải trình' : 'Chọn ảnh giải trình'}
            >
              <Ionicons name={photo ? 'trash-outline' : 'image-outline'} size={18} color={photo ? palette.danger : palette.primary} />
              <Text style={[styles.photoText, photo && { color: palette.danger }]} numberOfLines={1}>
                {photo ? photo.name : 'Đính kèm ảnh (tùy chọn, tối đa 5MB)'}
              </Text>
            </Pressable>
            <View style={styles.sheetActions}>
              <Pressable disabled={explanation.isSubmitting} onPress={close} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Để sau</Text>
              </Pressable>
              <Pressable
                disabled={!note.trim() || explanation.isSubmitting}
                onPress={() => void submit()}
                style={[styles.submitButton, (!note.trim() || explanation.isSubmitting) && styles.disabledButton]}
              >
                {explanation.isSubmitting ? <ActivityIndicator color={palette.white} /> : <Text style={styles.submitText}>Gửi cho HR</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  muted: { color: palette.textMuted, fontSize: 14 },
  list: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  emptyList: { flexGrow: 1 },
  infoBanner: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: palette.surfaceBrand, marginBottom: spacing.sm },
  infoText: { flex: 1, color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: palette.text, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  cardDate: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  sourceBadge: { backgroundColor: palette.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  sourceText: { color: palette.textSecondary, fontSize: 10, fontWeight: '700' },
  description: { color: palette.textSecondary, fontSize: 13, lineHeight: 20, marginTop: spacing.md },
  waitingBadge: { alignSelf: 'flex-start', marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, backgroundColor: palette.surfaceBrand, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  waitingText: { color: palette.primary, fontSize: 11, fontWeight: '700' },
  action: { minHeight: 44, marginTop: spacing.lg, borderRadius: radius.md, backgroundColor: palette.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  actionPressed: { backgroundColor: palette.primaryPressed },
  actionText: { color: palette.white, fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: palette.borderStrong, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { color: palette.text, fontSize: 20, lineHeight: 27, fontWeight: '800' },
  sheetSubtitle: { color: palette.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  waitingHint: { color: palette.primary, backgroundColor: palette.surfaceBrand, borderRadius: radius.md, padding: spacing.md, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  input: { minHeight: 140, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radius.md, padding: spacing.md, color: palette.text, fontSize: 14, lineHeight: 21, backgroundColor: palette.canvas },
  counter: { alignSelf: 'flex-end', color: palette.textMuted, fontSize: 11, marginTop: spacing.xs },
  photoButton: { minHeight: 44, marginTop: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  photoText: { flex: 1, color: palette.primary, fontSize: 13, fontWeight: '700' },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: palette.border },
  cancelText: { color: palette.textSecondary, fontSize: 14, fontWeight: '700' },
  submitButton: { flex: 1.4, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: palette.primary },
  disabledButton: { opacity: 0.45 },
  submitText: { color: palette.white, fontSize: 14, fontWeight: '800' },
});
