import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';

import type { FaceStatusResponse } from '../types';
import { formatFaceStatusLabel } from '../utils/face-quality';

interface FaceStatusCardProps {
  faceStatus?: FaceStatusResponse;
  isLoading?: boolean;
  onEnroll: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  registered: '#16A34A',
  consent_pending: '#D97706',
  revoked: '#94A3B8',
  not_registered: '#64748B',
};

export function FaceStatusCard({
  faceStatus,
  isLoading,
  onEnroll,
  onDelete,
  isDeleting,
}: FaceStatusCardProps) {
  const theme = useAuthTheme();

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const status = faceStatus?.status ?? 'not_registered';
  const color = STATUS_COLOR[status] ?? theme.textMuted;
  const isRegistered = status === 'registered';

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>🧑‍💼</Text>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.text }]}>Face ID</Text>
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.badgeText, { color }]}>{formatFaceStatusLabel(status)}</Text>
          </View>
        </View>
      </View>

      {faceStatus?.consent_given && faceStatus.consent_at && (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Đồng ý: {new Date(faceStatus.consent_at).toLocaleDateString('vi-VN')}
        </Text>
      )}
      {isRegistered && faceStatus?.registered_at && (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Đăng ký: {new Date(faceStatus.registered_at).toLocaleDateString('vi-VN')}
          {faceStatus.photo_count ? ` · ${faceStatus.photo_count} ảnh` : ''}
          {faceStatus.quality_score
            ? ` · Chất lượng ${(faceStatus.quality_score * 100).toFixed(0)}%`
            : ''}
        </Text>
      )}

      <View style={styles.actions}>
        {!isRegistered ? (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
            onPress={onEnroll}
          >
            <Text style={styles.btnPrimaryText}>
              {status === 'consent_pending' ? 'Tiếp tục đăng ký' : 'Đăng ký Face ID'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnDanger, { borderColor: theme.error }]}
            onPress={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <Text style={[styles.btnDangerText, { color: theme.error }]}>Thu hồi Face ID</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 28 },
  texts: { flex: 1, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12 },
  actions: { marginTop: 4 },
  btnPrimary: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDanger: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  btnDangerText: { fontSize: 15, fontWeight: '700' },
});
