import { isAxiosError } from 'axios';

import type {
  EmployeePendingCheck,
  RandomCheckMode,
  RandomCheckResponse,
} from '../types/random-check.type';

const MODES: RandomCheckMode[] = [
  'location_only',
  'location_face',
  'location_face_liveness',
];

export const RANDOM_CHECK_MODE_LABELS: Record<RandomCheckMode, string> = {
  location_only: 'Vị trí GPS',
  location_face: 'GPS + khuôn mặt',
  location_face_liveness: 'GPS + khuôn mặt + người thật',
};

export function getRandomCheckMode(configSnapshot: string): RandomCheckMode {
  try {
    const parsed = JSON.parse(configSnapshot) as Record<string, unknown>;
    const raw = parsed.checkMode ?? parsed.mode;
    if (typeof raw === 'string' && MODES.includes(raw as RandomCheckMode)) {
      return raw as RandomCheckMode;
    }
  } catch {
    // Snapshot comes from the server, but keep the employee flow usable if an
    // old record contains a non-JSON representation.
  }
  const match = MODES.find((mode) => configSnapshot.includes(mode));
  return match ?? 'location_only';
}

export function randomCheckRequiresFace(mode: RandomCheckMode): boolean {
  return mode !== 'location_only';
}

export function randomCheckRequiresLiveness(mode: RandomCheckMode): boolean {
  return mode === 'location_face_liveness';
}

export function secondsLeft(check: EmployeePendingCheck, now: number): number {
  if (!check.expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(check.expiresAt).getTime() - now) / 1000));
}

export function isRandomCheckProcessing(
  mode: RandomCheckMode,
  response: RandomCheckResponse,
): boolean {
  if (!randomCheckRequiresFace(mode)) return false;
  if (response.faceVerified === null) return true;
  return randomCheckRequiresLiveness(mode) && response.livenessVerified === null;
}

const FAILURE_LABELS: Record<string, string> = {
  location_mismatch: 'Vị trí hiện tại không nằm trong phạm vi công trình.',
  face_fail: 'Khuôn mặt không khớp với hồ sơ Face ID đã đăng ký.',
  liveness_fail: 'Không xác minh được người thật từ ảnh vừa chụp.',
};

export function randomCheckFailureLabel(reason: string | null): string {
  if (!reason) return 'Bằng chứng chưa đáp ứng policy của công ty.';
  return reason
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => FAILURE_LABELS[part.toLowerCase()] ?? part)
    .join(' ');
}

export function randomCheckErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const code = String(error.response?.data?.code ?? error.response?.data?.errorCode ?? '');
    const message = error.response?.data?.message;
    const known: Record<string, string> = {
      CHECK_NOT_SENT: 'Yêu cầu kiểm tra chưa được mở để phản hồi.',
      CHECK_EXPIRED: 'Yêu cầu đã hết thời gian phản hồi.',
      ALREADY_RESPONDED: 'Yêu cầu này đã được phản hồi trước đó.',
      EMPLOYEE_NOT_ACTIVE: 'Hồ sơ nhân viên không còn hoạt động.',
      FACE_ID_NOT_ENROLLED: 'Bạn cần đăng ký và được duyệt Face ID trước.',
    };
    if (known[code]) return known[code];
    if (typeof message === 'string' && message.trim()) return message;
    if (!error.response) return 'Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.';
  }
  return 'Không thể gửi kết quả kiểm tra. Vui lòng thử lại.';
}
