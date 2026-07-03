import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';

import { useFaceDelete, useFaceStatus } from '../hooks/useFaceRegistration';
import { useInvitationActions, usePendingInvitations } from '../hooks/use-invitation';
import { FaceStatusCard } from './FaceStatusCard';
import { InvitationCard } from './InvitationCard';

export function ProfileFaceSection() {
  const theme = useAuthTheme();
  const router = useRouter();
  const { faceStatus, isLoading, refetch } = useFaceStatus();
  const { deleteFace, isPending: isDeleting } = useFaceDelete();
  const { invitations, isLoading: invitationsLoading } = usePendingInvitations();
  const { accept, decline, isAccepting, isDeclining } = useInvitationActions();
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);

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
            deleteFace(undefined, { onSuccess: () => refetch() });
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
            <InvitationCard
              key={inv.id}
              invitation={inv}
              onAccept={(id) => {
                setActiveInvitationId(id);
                accept(id, { onSettled: () => setActiveInvitationId(null) });
              }}
              onDecline={(id) => {
                setActiveInvitationId(id);
                decline(id, { onSettled: () => setActiveInvitationId(null) });
              }}
              isAccepting={isAccepting && activeInvitationId === inv.id}
              isDeclining={isDeclining && activeInvitationId === inv.id}
            />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Nhận diện khuôn mặt</Text>
        <FaceStatusCard
          faceStatus={faceStatus}
          isLoading={isLoading || invitationsLoading}
          onEnroll={handleEnroll}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
});
