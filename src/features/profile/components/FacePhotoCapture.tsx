import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraView as CameraViewType } from 'expo-camera';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';
import { prepareFaceImageBase64 } from '@/features/face/utils/face-id.utils';

interface FacePhotoCaptureProps {
  onSubmit: (photoBase64: string) => void | Promise<void>;
  isSubmitting?: boolean;
  offlineReviewNotice?: boolean;
}

/** Camera-only capture: deliberately has no gallery picker to reduce photo replay. */
export function FacePhotoCapture({
  onSubmit,
  isSubmitting = false,
  offlineReviewNotice = false,
}: FacePhotoCaptureProps) {
  const theme = useAuthTheme();
  const cameraRef = useRef<CameraViewType>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionCard, { backgroundColor: theme.card }]}>
        <Ionicons name="camera-outline" size={38} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Cần quyền Camera</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Ảnh phải được chụp trực tiếp bằng camera trước; ứng dụng không nhận ảnh
          từ thư viện.
        </Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={
            permission.canAskAgain
              ? requestPermission
              : () => void Linking.openSettings()
          }
        >
          <Text style={styles.primaryButtonText}>
            {permission.canAskAgain ? 'Cấp quyền Camera' : 'Mở cài đặt ứng dụng'}
          </Text>
        </Pressable>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    setIsCapturing(true);
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!picture?.uri) throw new Error('Không chụp được ảnh từ camera.');
      setPhotoUri(picture.uri);
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : 'Không thể chụp ảnh. Vui lòng thử lại.',
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const submit = async () => {
    if (!photoUri || isSubmitting) return;
    setError(null);
    try {
      const base64 = await prepareFaceImageBase64(photoUri);
      await onSubmit(base64);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể xử lý ảnh. Vui lòng chụp lại.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.notice, { backgroundColor: theme.card }]}>
        <Ionicons
          name={offlineReviewNotice ? 'cloud-offline-outline' : 'scan-outline'}
          size={22}
          color={offlineReviewNotice ? theme.error : theme.primary}
        />
        <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
          {offlineReviewNotice
            ? 'Không có mạng: ảnh sẽ được lưu riêng trên máy và bản ghi liveness sẽ chờ HR duyệt sau khi đồng bộ.'
            : 'Nhìn thẳng, đủ sáng, tháo khẩu trang/kính râm và chỉ để một khuôn mặt trong khung.'}
        </Text>
      </View>

      <View style={styles.cameraWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.camera} contentFit="cover" />
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mirror={false}
            onCameraReady={() => setCameraReady(true)}
          />
        )}
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.faceOval} />
          {(isCapturing || isSubmitting) && (
            <View style={styles.busyOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.busyText}>
                {isSubmitting ? 'Đang ghi nhận...' : 'Đang chụp...'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {error && (
        <View style={[styles.errorCard, { backgroundColor: theme.errorBg }]}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      {photoUri ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            disabled={isSubmitting}
            onPress={() => setPhotoUri(null)}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
              Chụp lại
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            disabled={isSubmitting}
            onPress={() => void submit()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Dùng ảnh này</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[
            styles.primaryButton,
            {
              backgroundColor:
                cameraReady && !isCapturing
                  ? theme.primary
                  : theme.primaryDisabled,
            },
          ]}
          disabled={!cameraReady || isCapturing}
          onPress={() => void capture()}
        >
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Chụp khuôn mặt</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  center: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  permissionCard: {
    borderRadius: 20,
    padding: 24,
    gap: 14,
    alignItems: 'center',
  },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  notice: {
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 520,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#020617',
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: '68%',
    aspectRatio: 0.78,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  busyText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  errorCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    minHeight: 50,
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondaryButton: {
    minHeight: 50,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '800' },
});
