import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';

import { useCurrentEmployeeId } from '@/features/face/hooks/use-current-employee-id';
import { useFaceIdRevoke, useFaceIdStatus } from '@/features/face/hooks/use-face-id';
import { usePendingInvitations } from '../hooks/use-invitation';
import { FaceStatusCard } from './FaceStatusCard';
import { InvitationCard } from './InvitationCard';

export function ProfileFaceSection() {
  const theme = useAuthTheme();
  const router = useRouter();
  const { employeeId, isLoading: isLoadingEmployeeId } = useCurrentEmployeeId();
  const { faceIdStatus, isLoading: isLoadingStatus } = useFaceIdStatus(employeeId);
  const { revoke, isPending: isDeleting } = useFaceIdRevoke(employeeId);
  const { invitations, isLoading: invitationsLoading } = usePendingInvitations();

  const handleEnroll = () => {
    router.push('/face/enroll');
  };

  const handleDelete = () => {
    Alert.alert(
      'Thu hồi Face ID',
      'Dữ liệu khuôn mặt sẽ bị xóa. Bạn cần đăng ký lại để sử dụng nhận diện khuôn mặt.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận thu hồi',
          style: 'destructive',
          onPress: () => {
            revoke();
          },
        },
      ],
    );
  };

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  return (
    <View style={styles.wrap}>
      {pendingInvitations.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Lời mời</Text>
          {pendingInvitations.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Nhận diện khuôn mặt</Text>
        {!isLoadingEmployeeId && !employeeId ? (
          <Text style={[styles.noProfileText, { color: theme.textMuted }]}>
            Tài khoản này không có hồ sơ nhân viên, không thể dùng Face-ID
          </Text>
        ) : (
          <FaceStatusCard
            faceStatus={faceIdStatus}
            isLoading={isLoadingEmployeeId || isLoadingStatus || invitationsLoading}
            onEnroll={handleEnroll}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  section: { gap: 10 },
  noProfileText: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
});
