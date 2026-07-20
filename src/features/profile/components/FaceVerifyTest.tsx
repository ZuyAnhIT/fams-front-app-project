import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CameraView as CameraViewType } from 'expo-camera';

import { useAuthTheme } from '@/features/auth/theme';

import { useCurrentEmployeeId } from '@/features/face/hooks/use-current-employee-id';
import { useFaceVerify } from '@/features/face/hooks/use-face-verify';

export function FaceVerifyTest() {
  const theme = useAuthTheme();
  const { employeeId } = useCurrentEmployeeId();
  const { phase, result, submitVerify, reset } = useFaceVerify(employeeId);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewType>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleStart = () => setCameraOpen(true);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (picture?.uri) {
        setCameraOpen(false);
        submitVerify(picture.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetry = () => {
    reset();
    setCameraOpen(true);
  };

  if (cameraOpen) {
    if (!permission) {
      return (
        <View style={[styles.card, { borderColor: theme.border }]}>
          <ActivityIndicator color={theme.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.desc, { color: theme.textMuted }]}>
            Cần quyền Camera để test Face-ID.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.btnText}>Cấp quyền Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        </View>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.primary, opacity: isCapturing ? 0.6 : 1 }]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Chụp ảnh</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'submitting' || phase === 'polling') {
    return (
      <View style={[styles.card, { borderColor: theme.border }]}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.title, { color: theme.text, marginTop: 8 }]}>Đang xác thực...</Text>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Có thể mất vài giây, vui lòng đợi.
        </Text>
      </View>
    );
  }

  if (phase === 'result' && result) {
    const passed = result.status === 'pass';
    return (
      <View style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.title, { color: passed ? theme.success : theme.error }]}>
          {passed ? 'Xác thực thành công' : 'Không khớp khuôn mặt'}
        </Text>
        {__DEV__ && (
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            score: {result.score !== null && result.score !== undefined ? result.score.toFixed(2) : '—'}
            {' · '}
            errorCode: {result.errorCode ?? '-'}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: theme.border }]}
          onPress={handleRetry}
        >
          <Text style={[styles.btnOutlineText, { color: theme.textSecondary }]}>Test lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'timeout') {
    return (
      <View style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.desc, { color: theme.error }]}>Không nhận được phản hồi, thử lại</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleRetry}>
          <Text style={styles.btnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.desc, { color: theme.error }]}>Có lỗi xảy ra, vui lòng thử lại.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleRetry}>
          <Text style={styles.btnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Test Face-ID</Text>
      <Text style={[styles.desc, { color: theme.textMuted }]}>
        Chụp thử 1 ảnh để kiểm tra xác thực khuôn mặt.
      </Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: theme.primary, opacity: employeeId ? 1 : 0.5 }]}
        onPress={handleStart}
        disabled={!employeeId}
      >
        <Text style={styles.btnText}>Bắt đầu test</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center' },
  hint: { fontSize: 12, textAlign: 'center' },
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: { flex: 1 },
  btn: { marginTop: 4, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnOutline: { marginTop: 4, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  btnOutlineText: { fontSize: 14, fontWeight: '600' },
});
