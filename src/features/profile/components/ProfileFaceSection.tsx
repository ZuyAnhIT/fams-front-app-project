import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthTheme } from '@/features/auth/theme';

import { useCurrentEmployeeId } from '@/features/face/hooks/use-current-employee-id';
import { useFaceIdRevoke, useFaceIdStatus } from '@/features/face/hooks/use-face-id';
import { FaceStatusCard } from './FaceStatusCard';

export function ProfileFaceSection() {
  const theme = useAuthTheme();
  const router = useRouter();
  const { employeeId, isLoading: isLoadingEmployeeId } = useCurrentEmployeeId();
  const {
    faceIdStatus,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useFaceIdStatus(employeeId);
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
        ) : isStatusError ? (
          <View style={[styles.errorCard, { backgroundColor: theme.errorBg }]}>
            <Text style={[styles.errorText, { color: theme.error }]}>
              Không thể tải trạng thái Face ID. Dữ liệu hiện tại không được giả
              định là “chưa đăng ký”.
            </Text>
            <Text
              style={[styles.retryText, { color: theme.primary }]}
              onPress={() => void refetchStatus()}
            >
              Thử lại
            </Text>
          </View>
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
        description="Hồ sơ khuôn mặt và lượt đang chờ duyệt sẽ bị thu hồi. Các công trình bắt buộc Face ID có thể không cho phép bạn tự chấm công cho tới khi đăng ký và được duyệt lại."
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
  errorCard: { borderRadius: 12, padding: 12, gap: 7 },
  errorText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  retryText: { fontSize: 13, lineHeight: 19, fontWeight: '800' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
});
