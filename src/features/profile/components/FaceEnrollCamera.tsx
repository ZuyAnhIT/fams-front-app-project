import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CameraView as CameraViewType } from 'expo-camera';

import { useAuthTheme } from '@/features/auth/theme';

import { useFaceEnrollStore } from '@/features/face/store/face-enroll.store';
import {
  FACE_MAX_PHOTOS,
  FACE_MIN_PHOTOS,
  FACE_POSE_HINTS,
  validateFaceImage,
} from '@/features/face/utils/face-quality';
import { prepareFaceImageForUpload } from '@/features/face/utils/face-id.utils';
import { FaceEnrollProgress } from './FaceEnrollProgress';
import { FacePhotoPreview } from './FacePhotoPreview';

interface FaceEnrollCameraProps {
  onComplete: () => void;
  onRegister: () => void;
  isRegistering?: boolean;
}

export function FaceEnrollCamera({ onComplete, onRegister, isRegistering }: FaceEnrollCameraProps) {
  const theme = useAuthTheme();
  const cameraRef = useRef<CameraViewType>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  const enrollSession = useFaceEnrollStore((s) => s.enrollSession);
  const addCapturedPhoto = useFaceEnrollStore((s) => s.addCapturedPhoto);
  const removeLastPhoto = useFaceEnrollStore((s) => s.removeLastPhoto);

  const photos = enrollSession?.photos ?? [];
  const photoCount = photos.length;
  const poseHint = FACE_POSE_HINTS[photoCount] ?? FACE_POSE_HINTS[FACE_POSE_HINTS.length - 1];
  const canSubmit = photoCount >= FACE_MIN_PHOTOS && photoCount <= FACE_MAX_PHOTOS;

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    if (photoCount >= FACE_MAX_PHOTOS) return;

    setIsCapturing(true);
    setQualityError(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!picture?.uri) {
        setQualityError('Không chụp được ảnh. Vui lòng thử lại.');
        return;
      }

      const quality = validateFaceImage({
        uri: picture.uri,
        width: picture.width,
        height: picture.height,
      });

      if (!quality.isValid) {
        setQualityError(quality.issues[0] ?? 'Ảnh không đạt chất lượng');
        return;
      }

      // Resize/nén dưới 1MB + convert sang JPEG (kể cả HEIC) trước khi lưu vào batch
      const processed = await prepareFaceImageForUpload(picture.uri);

      addCapturedPhoto({
        uri: processed.uri,
        width: processed.width,
        height: processed.height,
        quality,
        capturedAt: new Date().toISOString(),
      });
    } catch {
      setQualityError('Lỗi camera. Vui lòng thử lại.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    const canRequestAgain = permission.canAskAgain;
    return (
      <View style={[styles.permissionBox, { backgroundColor: theme.card }]}>
        <Text style={[styles.permissionTitle, { color: theme.text }]}>Cần quyền Camera</Text>
        <Text style={[styles.permissionDesc, { color: theme.textSecondary }]}>
          Ứng dụng cần quyền camera để chụp ảnh đăng ký Face ID.
        </Text>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
          onPress={canRequestAgain ? requestPermission : () => void Linking.openSettings()}
          accessibilityRole="button"
          accessibilityLabel={canRequestAgain ? 'Cấp quyền Camera' : 'Mở cài đặt ứng dụng'}
        >
          <Text style={styles.btnPrimaryText}>
            {canRequestAgain ? 'Cấp quyền Camera' : 'Mở cài đặt ứng dụng'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <FaceEnrollProgress current={photoCount} total={FACE_MAX_PHOTOS} />

      <Text style={[styles.poseHint, { color: theme.text }]}>{poseHint}</Text>

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onCameraReady={() => setCameraReady(true)}
        />
        <View style={styles.ovalOverlay} pointerEvents="none">
          <View style={[styles.oval, { borderColor: 'rgba(255,255,255,0.85)' }]} />
        </View>
      </View>

      {qualityError && (
        <Text style={[styles.errorText, { color: theme.error }]}>{qualityError}</Text>
      )}

      <FacePhotoPreview photos={photos} onRemoveLast={photoCount > 0 ? removeLastPhoto : undefined} />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.captureBtn,
            {
              borderColor: theme.primary,
              opacity: photoCount >= FACE_MAX_PHOTOS || isCapturing ? 0.5 : 1,
            },
          ]}
          onPress={handleCapture}
          disabled={photoCount >= FACE_MAX_PHOTOS || isCapturing || !cameraReady}
          accessibilityRole="button"
          accessibilityLabel={`Chụp ảnh khuôn mặt thứ ${Math.min(photoCount + 1, FACE_MAX_PHOTOS)}`}
          accessibilityState={{ disabled: photoCount >= FACE_MAX_PHOTOS || isCapturing || !cameraReady, busy: isCapturing }}
        >
          {isCapturing ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <View style={[styles.captureInner, { backgroundColor: theme.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footerActions}>
        {canSubmit && (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
            onPress={onRegister}
            disabled={isRegistering}
            accessibilityRole="button"
            accessibilityLabel={`Hoàn tất đăng ký với ${photoCount} ảnh`}
          >
            {isRegistering ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Hoàn tất đăng ký ({photoCount} ảnh)</Text>
            )}
          </TouchableOpacity>
        )}

        {photoCount >= FACE_MIN_PHOTOS && photoCount < FACE_MAX_PHOTOS && (
          <TouchableOpacity onPress={onComplete} disabled={isRegistering}>
            <Text style={[styles.skipMore, { color: theme.textMuted }]}>
              Hoặc chụp thêm tối đa {FACE_MAX_PHOTOS} ảnh để tăng độ chính xác
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permissionBox: { padding: 24, borderRadius: 16, gap: 12, margin: 20 },
  permissionTitle: { fontSize: 18, fontWeight: '700' },
  permissionDesc: { fontSize: 14, lineHeight: 20 },
  poseHint: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: { flex: 1 },
  ovalOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oval: {
    width: 220,
    height: 300,
    borderRadius: 110,
    borderWidth: 3,
  },
  errorText: { fontSize: 13, textAlign: 'center', fontWeight: '500' },
  controls: { alignItems: 'center', paddingVertical: 8 },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 56, height: 56, borderRadius: 28 },
  footerActions: { gap: 10 },
  btnPrimary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skipMore: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
