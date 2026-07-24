import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthTheme } from '@/features/auth/hooks/use-auth-theme';

import { useCurrentEmployeeId } from '@/features/face/hooks/use-current-employee-id';
import { useFaceIdRevoke, useFaceIdStatus } from '@/features/face/hooks/use-face-id';
import { FaceStatusCard } from './FaceStatusCard';

export function ProfileFaceSection() {
  const theme = useAuthTheme();
  const router = useRouter();
  const { employeeId, isLoading: isLoadingEmployeeId } = useCurrentEmployeeId();
  const { faceIdStatus, isLoading: isLoadingStatus } = useFaceIdStatus(employeeId);
  const { revoke, isPending: isDeleting } = useFaceIdRevoke(employeeId);
  const [revokeConfirmationVisible, setRevokeConfirmationVisible] = useState(false);

  const handleEnroll = () => {
    router.push('/face/enroll');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Nhận diện khuôn mặt</Text>
        {!isLoadingEmployeeId && !employeeId ? (
          <Text style={[styles.noProfileText, { color: theme.textMuted }]}>
            Tài khoản này không có hồ sơ nhân viên, không thể dùng Face-ID
          </Text>
        ) : (
          <FaceStatusCard
            faceStatus={faceIdStatus}
            isLoading={isLoadingEmployeeId || isLoadingStatus}
            onEnroll={handleEnroll}
            onDelete={() => setRevokeConfirmationVisible(true)}
            isDeleting={isDeleting}
          />
        )}
      </View>
      <ConfirmDialog
        visible={revokeConfirmationVisible}
        title="Thu hồi Face ID?"
        description="Dữ liệu khuôn mặt đã đăng ký sẽ bị xóa. Bạn cần đăng ký lại trước khi sử dụng xác thực khuôn mặt."
        confirmLabel="Thu hồi Face ID"
        destructive
        loading={isDeleting}
        onCancel={() => setRevokeConfirmationVisible(false)}
        onConfirm={() => {
          revoke();
          setRevokeConfirmationVisible(false);
        }}
      />
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
