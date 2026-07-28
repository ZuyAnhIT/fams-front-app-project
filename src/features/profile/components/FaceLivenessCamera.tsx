import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraView as CameraViewType } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';
import { useFaceLiveness } from '@/features/face/hooks/use-face-liveness';
import type {
  FaceImagePayload,
  FaceLivenessAction,
  FaceLivenessChallengeDto,
  FaceLivenessPurpose,
  FaceLivenessStepResult,
} from '@/features/face/types/FaceId';
import {
  getFaceIdErrorCode,
  parseFaceIdError,
  prepareFaceImageForUpload,
} from '@/features/face/utils/face-id.utils';

const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000;

const ACTION_COPY: Record<
  FaceLivenessAction,
  { title: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  center: {
    title: 'Nhìn thẳng vào camera',
    description: 'Giữ khuôn mặt ở giữa khung, mắt mở và không nghiêng đầu.',
    icon: 'scan-outline',
  },
  turn_left: {
    title: 'Quay đầu sang trái',
    description: 'Quay vừa đủ khoảng 20°, vẫn giữ toàn bộ khuôn mặt trong khung.',
    icon: 'arrow-back-circle-outline',
  },
  turn_right: {
    title: 'Quay đầu sang phải',
    description: 'Quay vừa đủ khoảng 20°, vẫn giữ toàn bộ khuôn mặt trong khung.',
    icon: 'arrow-forward-circle-outline',
  },
  look_up: {
    title: 'Ngẩng mặt lên',
    description: 'Ngẩng nhẹ cằm và giữ điện thoại đứng yên.',
    icon: 'arrow-up-circle-outline',
  },
  look_down: {
    title: 'Cúi mặt xuống',
    description: 'Cúi nhẹ cằm và giữ điện thoại đứng yên.',
    icon: 'arrow-down-circle-outline',
  },
  blink: {
    title: 'Nhắm cả hai mắt',
    description: 'Nhắm mắt khi bộ đếm về 0 và giữ trong khoảnh khắc chụp.',
    icon: 'eye-off-outline',
  },
};

const FAILURE_COPY: Record<string, string> = {
  invalid_image: 'Camera không tạo được ảnh hợp lệ.',
  no_face_detected: 'Không phát hiện khuôn mặt.',
  multiple_faces_detected: 'Có nhiều hơn một khuôn mặt trong ảnh.',
};

interface FaceLivenessCameraBaseProps {
  employeeId: string;
  onPassed: (challengeId: string) => void | Promise<void>;
  isFinalizing?: boolean;
}

type FaceLivenessCameraProps = FaceLivenessCameraBaseProps &
  (
    | { purpose: Extract<FaceLivenessPurpose, 'enroll'>; siteId?: never }
    | { purpose: Extract<FaceLivenessPurpose, 'checkin'>; siteId: string }
  );

export function FaceLivenessCamera({
  employeeId,
  purpose,
  siteId,
  onPassed,
  isFinalizing = false,
}: FaceLivenessCameraProps) {
  const theme = useAuthTheme();
  const cameraRef = useRef<CameraViewType>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { startChallenge, submitFrames, isStarting, isSubmitting, reset } =
    useFaceLiveness(employeeId, purpose, siteId);

  const [challenge, setChallenge] =
    useState<FaceLivenessChallengeDto | null>(null);
  const [frames, setFrames] = useState<FaceImagePayload[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [failureSteps, setFailureSteps] = useState<FaceLivenessStepResult[]>([]);
  const [challengeFailed, setChallengeFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const currentAction = challenge?.actions[stepIndex] ?? null;
  const actionCopy = currentAction ? ACTION_COPY[currentAction] : null;
  const secondsRemaining = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000))
    : 0;
  const isExpired = !!challenge && secondsRemaining <= 0;
  const rateLimitSeconds = rateLimitedUntil
    ? Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000))
    : 0;
  const isRateLimited = rateLimitSeconds > 0;
  const busy =
    isStarting || isSubmitting || isCapturing || isFinalizing || countdown !== null;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      void captureCurrentStep();
      return;
    }

    const timer = setTimeout(() => setCountdown((value) => (value ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
    // captureCurrentStep intentionally uses the state at the end of the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const progressText = challenge
    ? `Bước ${Math.min(stepIndex + 1, challenge.actions.length)}/${challenge.actions.length}`
    : null;

  const startNewChallenge = async () => {
    if (isStarting) return;
    setErrorMessage(null);
    setFailureSteps([]);
    setChallengeFailed(false);
    setFrames([]);
    setStepIndex(0);
    setCountdown(null);
    setCameraReady(false);
    reset();

    try {
      const nextChallenge = await startChallenge();
      setChallenge(nextChallenge);
      setNow(Date.now());
    } catch (error) {
      if (getFaceIdErrorCode(error) === 'TOO_MANY_ATTEMPTS') {
        setRateLimitedUntil(Date.now() + RATE_LIMIT_COOLDOWN_MS);
      }
      setErrorMessage(parseFaceIdError(error));
    }
  };

  const beginWithPermission = async () => {
    if (!permission) return;
    if (!permission.granted) {
      if (!permission.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      const nextPermission = await requestPermission();
      if (!nextPermission.granted) return;
    }
    await startNewChallenge();
  };

  const captureCurrentStep = async () => {
    if (
      !cameraRef.current ||
      !cameraReady ||
      !challenge ||
      !currentAction ||
      isCapturing ||
      isExpired
    ) {
      return;
    }

    setIsCapturing(true);
    setErrorMessage(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      if (!picture?.uri) {
        throw new Error('Không chụp được ảnh từ camera.');
      }

      const processed = await prepareFaceImageForUpload(picture.uri);
      const nextFrames = [...frames, processed];

      if (stepIndex < challenge.actions.length - 1) {
        setFrames(nextFrames);
        setStepIndex((value) => value + 1);
        return;
      }

      const result = await submitFrames({
        challengeId: challenge.challengeId,
        frames: nextFrames,
      });
      if (result.status === 'passed') {
        await onPassed(challenge.challengeId);
        return;
      }

      setChallengeFailed(true);
      setFailureSteps(result.steps.filter((step) => !step.passed));
      setErrorMessage(
        'Chưa xác minh được người thật. Xem bước chưa đạt và thực hiện lại bằng thử thách mới.',
      );
    } catch (error) {
      if (challenge && stepIndex === challenge.actions.length - 1) {
        // A passed challenge that could not be consumed must not leave the UI
        // trying to upload the same frames again. Start from a fresh challenge.
        setChallenge(null);
        setFrames([]);
        setStepIndex(0);
      }
      setErrorMessage(
        error instanceof Error && !('response' in error)
          ? error.message
          : parseFaceIdError(error),
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const failedStepCopy = useMemo(
    () =>
      failureSteps.map((step) => {
        const action =
          step.action === 'anti_spoof_check'
            ? 'Kiểm tra ảnh thật'
            : ACTION_COPY[step.action]?.title ?? step.action;
        const detail = step.reason
          ? FAILURE_COPY[step.reason] ?? 'Hành động chưa đạt yêu cầu.'
          : 'Hành động chưa đạt yêu cầu.';
        return { action, detail };
      }),
    [failureSteps],
  );

  if (!challenge) {
    return (
      <View style={[styles.introCard, { backgroundColor: theme.card }]}>
        <View style={[styles.introIcon, { backgroundColor: `${theme.primary}14` }]}>
          <Ionicons name="shield-checkmark-outline" size={36} color={theme.primary} />
        </View>
        <Text style={[styles.introTitle, { color: theme.text }]}>
          Xác minh người thật
        </Text>
        <Text style={[styles.introText, { color: theme.textSecondary }]}>
          Hệ thống sẽ đưa ra 3 hành động ngẫu nhiên. Mỗi bước chỉ chụp một ảnh
          và thử thách hết hạn sau 90 giây.
        </Text>
        <View style={styles.tipList}>
          <Text style={[styles.tip, { color: theme.textSecondary }]}>
            • Đứng ở nơi đủ sáng, không ngược sáng.
          </Text>
          <Text style={[styles.tip, { color: theme.textSecondary }]}>
            • Tháo khẩu trang, kính râm và không để người khác vào khung hình.
          </Text>
          <Text style={[styles.tip, { color: theme.textSecondary }]}>
            • Giữ điện thoại ngang tầm mắt và làm đúng từng hướng dẫn.
          </Text>
          <Text style={[styles.tip, { color: theme.textSecondary }]}>
            • Hệ thống giới hạn tối đa 5 lần bắt đầu trong mỗi 10 phút.
          </Text>
        </View>
        {errorMessage && (
          <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
        )}
        {isRateLimited && (
          <Text style={[styles.cooldownText, { color: theme.textMuted }]}>
            Có thể thử lại sau {Math.floor(rateLimitSeconds / 60)}:
            {String(rateLimitSeconds % 60).padStart(2, '0')}
          </Text>
        )}
        <Pressable
          style={[
            styles.primaryButton,
            {
              backgroundColor:
                isStarting || !permission || isRateLimited
                  ? theme.primaryDisabled
                  : theme.primary,
            },
          ]}
          onPress={() => void beginWithPermission()}
          disabled={isStarting || !permission || isRateLimited}
          accessibilityRole="button"
        >
          {isStarting || !permission ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Bắt đầu xác minh</Text>
          )}
        </Pressable>
      </View>
    );
  }

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
      <View style={[styles.permissionCard, { backgroundColor: theme.card }]}>
        <Ionicons name="camera-outline" size={34} color={theme.primary} />
        <Text style={[styles.introTitle, { color: theme.text }]}>Cần quyền Camera</Text>
        <Text style={[styles.introText, { color: theme.textSecondary }]}>
          Camera trước chỉ được mở trong lúc thực hiện thử thách Face ID.
        </Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={
            canRequestAgain ? requestPermission : () => void Linking.openSettings()
          }
        >
          <Text style={styles.primaryButtonText}>
            {canRequestAgain ? 'Cấp quyền Camera' : 'Mở cài đặt ứng dụng'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: theme.primary }]}>
          {progressText}
        </Text>
        <Text
          style={[
            styles.expiryText,
            { color: secondsRemaining <= 20 ? theme.error : theme.textMuted },
          ]}
        >
          Còn {secondsRemaining}s
        </Text>
      </View>

      <View style={styles.stepIndicators}>
        {challenge.actions.map((action, index) => (
          <View
            key={`${action}-${index}`}
            style={[
              styles.stepIndicator,
              {
                backgroundColor:
                  index < stepIndex
                    ? theme.success
                    : index === stepIndex
                      ? theme.primary
                      : theme.border,
              },
            ]}
          />
        ))}
      </View>

      {actionCopy && (
        <View style={styles.instruction}>
          <Ionicons name={actionCopy.icon} size={26} color={theme.primary} />
          <View style={styles.instructionCopy}>
            <Text style={[styles.instructionTitle, { color: theme.text }]}>
              {actionCopy.title}
            </Text>
            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
              {actionCopy.description}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          mirror={false}
          onCameraReady={() => setCameraReady(true)}
        />
        <View pointerEvents="none" style={styles.cameraOverlay}>
          <View style={styles.faceOval} />
          {countdown !== null && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}
          {(isSubmitting || isFinalizing) && (
            <View style={styles.countdownOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>
                {isFinalizing ? 'Đang hoàn tất...' : 'Đang phân tích...'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {errorMessage && (
        <View style={[styles.errorCard, { backgroundColor: theme.errorBg }]}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
          <View style={styles.errorCopy}>
            <Text style={[styles.errorText, { color: theme.error }]}>
              {errorMessage}
            </Text>
            {failedStepCopy.map((step) => (
              <Text
                key={`${step.action}-${step.detail}`}
                style={[styles.errorDetail, { color: theme.textSecondary }]}
              >
                • {step.action}: {step.detail}
              </Text>
            ))}
          </View>
        </View>
      )}

      {isExpired || challengeFailed ? (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setChallenge(null);
            void startNewChallenge();
          }}
          disabled={busy}
        >
          <Text style={styles.primaryButtonText}>Tạo thử thách mới</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[
            styles.primaryButton,
            {
              backgroundColor:
                cameraReady && !busy ? theme.primary : theme.primaryDisabled,
            },
          ]}
          onPress={() => setCountdown(2)}
          disabled={!cameraReady || busy}
          accessibilityRole="button"
          accessibilityLabel={`Chụp bước ${stepIndex + 1}: ${actionCopy?.title ?? ''}`}
        >
          {isCapturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {countdown !== null ? 'Giữ nguyên tư thế...' : 'Sẵn sàng — chụp sau 2 giây'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  center: { minHeight: 320, justifyContent: 'center', alignItems: 'center' },
  introCard: { borderRadius: 20, padding: 22, gap: 14, alignItems: 'center' },
  permissionCard: { borderRadius: 20, padding: 24, gap: 14, alignItems: 'center' },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  introText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  tipList: { alignSelf: 'stretch', gap: 7 },
  tip: { fontSize: 13, lineHeight: 19 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: { fontSize: 13, fontWeight: '800' },
  expiryText: { fontSize: 12, fontWeight: '700' },
  stepIndicators: { flexDirection: 'row', gap: 6 },
  stepIndicator: { flex: 1, height: 5, borderRadius: 3 },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionCopy: { flex: 1 },
  instructionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  instructionText: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 520,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#020617',
  },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: 224,
    height: 306,
    borderRadius: 112,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  countdownText: { color: '#fff', fontSize: 82, lineHeight: 92, fontWeight: '900' },
  processingText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 12,
    padding: 12,
  },
  errorCopy: { flex: 1, gap: 4 },
  errorText: { fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'left' },
  errorDetail: { fontSize: 12, lineHeight: 18 },
  cooldownText: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  primaryButton: {
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, lineHeight: 21, fontWeight: '800' },
});
