import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';
import { shadows } from '@/theme/tokens';

import type { FaceIdStatusDto } from '@/features/face/types/FaceId';
import { requiresFaceIdReEnrollment } from '@/features/face/utils/face-id.utils';
import { formatFaceStatusLabel } from '@/features/face/utils/face-quality';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';

interface FaceStatusCardProps {
  faceStatus?: FaceIdStatusDto;
  isLoading?: boolean;
  onEnroll: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  enrolled: '#16A34A',
  revoked: '#94A3B8',
  not_enrolled: '#64748B',
};

const REVIEW_COLOR = '#B45309';

export function FaceStatusCard({
  faceStatus,
  isLoading,
  onEnroll,
  onDelete,
  isDeleting,
}: FaceStatusCardProps) {
  const theme = useAuthTheme();
  const { formatDate, formatDateTime } = useTenantPreferences();

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
  const isPendingReview = faceStatus?.reviewStatus === 'pending';
  const isRejected = faceStatus?.reviewStatus === 'rejected';
  const needsModelUpgrade = requiresFaceIdReEnrollment(faceStatus);

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
          {isPendingReview && (
            <View style={[styles.badge, { backgroundColor: `${REVIEW_COLOR}18` }]}>
              <Ionicons name="time-outline" size={13} color={REVIEW_COLOR} />
              <Text style={[styles.badgeText, { color: REVIEW_COLOR }]}>
                Đang chờ HR duyệt
              </Text>
            </View>
          )}
        </View>
      </View>

      {faceStatus?.consentGiven && faceStatus.consentGivenAt && (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Đồng ý: {formatDate(faceStatus.consentGivenAt)}
        </Text>
      )}
      {isEnrolled && faceStatus?.enrolledAt && (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Đăng ký: {formatDate(faceStatus.enrolledAt)}
        </Text>
      )}
      {faceStatus?.submittedAt && isPendingReview && (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Gửi duyệt: {formatDateTime(faceStatus.submittedAt)}
        </Text>
      )}
      {isPendingReview && isEnrolled && (
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          {needsModelUpgrade
            ? 'Hồ sơ cũ không tương thích với hệ nhận diện mới. Hãy chờ lượt đăng ký lại được duyệt trước khi check-in bằng Face ID.'
            : 'Face ID hiện tại vẫn dùng được trong lúc chờ HR duyệt lượt đăng ký lại.'}
        </Text>
      )}
      {needsModelUpgrade && !isPendingReview && (
        <View style={[styles.upgradeBox, { backgroundColor: `${theme.primary}10` }]}>
          <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
          <View style={styles.upgradeCopy}>
            <Text style={[styles.upgradeTitle, { color: theme.text }]}>
              Hệ thống nhận diện vừa được nâng cấp
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Hồ sơ này được tạo trước đợt nâng cấp InsightFace và không thể so
              khớp với ArcFace 512 chiều. Hãy đăng ký lại trước lần check-in
              tiếp theo.
            </Text>
          </View>
        </View>
      )}
      {isRejected && (
        <View style={[styles.rejectionBox, { backgroundColor: theme.errorBg }]}>
          <Text style={[styles.rejectionTitle, { color: theme.error }]}>
            Hồ sơ gần nhất bị từ chối
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            {faceStatus?.rejectionReason || 'HR chưa cung cấp lý do cụ thể.'}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {!isPendingReview && (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
            onPress={onEnroll}
          >
            <Text style={styles.btnPrimaryText}>
              {needsModelUpgrade
                ? 'Nâng cấp / Đăng ký lại Face ID'
                : isEnrolled || isRejected
                  ? 'Đăng ký lại Face ID'
                  : 'Đăng ký Face ID'}
            </Text>
          </TouchableOpacity>
        )}
        {isPendingReview && (
          <View style={[styles.pendingButton, { backgroundColor: theme.borderLight }]}>
            <Ionicons name="hourglass-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.pendingButtonText, { color: theme.textMuted }]}>
              Đang chờ kết quả duyệt
            </Text>
          </View>
        )}
        {(isEnrolled || isPendingReview || faceStatus?.consentGiven) &&
          status !== 'revoked' && (
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
  infoText: { fontSize: 12, lineHeight: 18 },
  rejectionBox: { borderRadius: 12, padding: 11, gap: 3 },
  rejectionTitle: { fontSize: 12, lineHeight: 18, fontWeight: '800' },
  upgradeBox: {
    borderRadius: 12,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  upgradeCopy: { flex: 1, gap: 2 },
  upgradeTitle: { fontSize: 12, lineHeight: 18, fontWeight: '800' },
  actions: { marginTop: 4, gap: 9 },
  btnPrimary: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDanger: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  btnDangerText: { fontSize: 15, fontWeight: '700' },
  pendingButton: {
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  pendingButtonText: { fontSize: 14, fontWeight: '700' },
});
