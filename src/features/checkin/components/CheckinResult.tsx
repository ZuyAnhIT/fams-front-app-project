import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCheckinExplain } from '../hooks/use-checkin-explain';
import { useCheckinResult } from '../hooks/use-checkin-result';
import { CHECKIN_STATUS_COLORS, CHECKIN_STATUS_LABELS, formatWorkMinutes } from '../utils/checkin.mapper';

interface CheckinResultProps {
  checkinId: string;
}

/** US6: hiển thị kết quả check-in/out + bonus nút giải trình khi status khác 'valid'. */
export function CheckinResult({ checkinId }: CheckinResultProps) {
  const { result, isLoading, isError, refetch } = useCheckinResult(checkinId);
  const { submitExplanation, isSubmitting } = useCheckinExplain(checkinId);
  const [showExplainForm, setShowExplainForm] = useState(false);
  const [note, setNote] = useState('');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (isError || !result) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Không thể tải kết quả chấm công.</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const canExplain = result.status !== 'valid';

  const handleSubmitExplain = async () => {
    if (!note.trim()) return;
    await submitExplanation({ note: note.trim() });
    setShowExplainForm(false);
    setNote('');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.card}>
        <Text style={[styles.statusText, { color: CHECKIN_STATUS_COLORS[result.status] }]}>
          {CHECKIN_STATUS_LABELS[result.status]}
        </Text>
        <Text style={styles.message}>{result.message}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Check-in</Text>
          <Text style={styles.value}>{new Date(result.checkInAt).toLocaleString('vi-VN')}</Text>
        </View>
        {result.checkOutAt && (
          <View style={styles.row}>
            <Text style={styles.label}>Check-out</Text>
            <Text style={styles.value}>{new Date(result.checkOutAt).toLocaleString('vi-VN')}</Text>
          </View>
        )}
        {result.workMinutes !== null && (
          <View style={styles.row}>
            <Text style={styles.label}>Thời gian làm việc</Text>
            <Text style={styles.value}>{formatWorkMinutes(result.workMinutes)}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Trong geofence</Text>
          <Text style={styles.value}>{result.checkInInsideGeofence ? 'Có' : 'Không'}</Text>
        </View>

        {canExplain && !showExplainForm && (
          <Pressable style={styles.explainButton} onPress={() => setShowExplainForm(true)}>
            <Text style={styles.explainButtonText}>Giải trình</Text>
          </Pressable>
        )}

        {showExplainForm && (
          <View style={styles.explainForm}>
            <Text style={styles.explainNote}>
              Cần xác nhận thêm: field chính xác của API giải trình (ảnh kèm theo, v.v.) — form dưới
              đây chỉ gửi ghi chú dạng text.
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập lý do giải trình..."
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Pressable
              disabled={!note.trim() || isSubmitting}
              onPress={handleSubmitExplain}
              style={[styles.explainButton, (!note.trim() || isSubmitting) && styles.disabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.explainButtonText}>Gửi giải trình</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  statusText: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, color: '#475569', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13, color: '#64748B' },
  value: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  explainButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  explainButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },
  explainForm: { gap: 8, marginTop: 8 },
  explainNote: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
  textInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
