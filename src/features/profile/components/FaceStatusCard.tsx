import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/hooks/use-auth-theme';
import { shadows } from '@/theme/tokens';

import type { FaceIdStatusDto } from '@/features/face/types/FaceId';
import { formatFaceStatusLabel } from '@/features/face/utils/face-quality';

interface FaceStatusCardProps {
  faceStatus?: FaceIdStatusDto;
  isLoading?: boolean;
  onEnroll: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  enrolled: '#16A34A',
  pending: '#D97706',
  revoked: '#94A3B8',
  not_enrolled: '#64748B',
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

  const status = faceStatus?.status ?? 'not_enrolled';
  const color = STATUS_COLOR[status] ?? theme.textMuted;
  const isEnrolled = status === 'enrolled';

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={28} color={theme.textSecondary} />
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.text }]}>Face ID</Text>
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.badgeText, { color }]}>{formatFaceStatusLabel(status)}</Text>
          </View>
        </View>
      </View>

      {faceStatus?.consentGiven && faceStatus.consentGivenAt && (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Đồng ý: {new Date(faceStatus.consentGivenAt).toLocaleDateString('vi-VN')}
        </Text>
      )}
      {isEnrolled && faceStatus?.enrolledAt && (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Đăng ký: {new Date(faceStatus.enrolledAt).toLocaleDateString('vi-VN')}
        </Text>
      )}

      <View style={styles.actions}>
        {!isEnrolled ? (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
            onPress={onEnroll}
          >
            <Text style={styles.btnPrimaryText}>
              {status === 'pending' ? 'Tiếp tục đăng ký' : 'Đăng ký Face ID'}
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
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
