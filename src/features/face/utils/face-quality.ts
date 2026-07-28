import type { FaceImagePayload, FaceQualityResult } from '../types/FaceId';

/** Số ảnh tối thiểu / tối đa khi đăng ký Face ID */
export const FACE_MIN_PHOTOS = 3;
export const FACE_MAX_PHOTOS = 5;

/** Phiên bản văn bản đồng ý Face ID (mock – backend sẽ trả version thật) */
export const FACE_CONSENT_VERSION = '1.0.0';

export const FACE_POSE_HINTS = [
  'Nhìn thẳng vào camera',
  'Quay mặt sang trái nhẹ (~15°)',
  'Quay mặt sang phải nhẹ (~15°)',
  'Ngẩng cằm lên nhẹ',
  'Cúi cằm xuống nhẹ',
] as const;

const MIN_WIDTH = 480;
const MIN_HEIGHT = 640;
const MIN_SCORE = 0.65;

/**
 * Kiểm tra chất lượng ảnh khuôn mặt (client-side heuristic).
 * Khi có API thật, backend sẽ validate lại — hàm này giữ UX phản hồi nhanh.
 */
export function checkFaceImageQuality(image: FaceImagePayload): FaceQualityResult {
  const issues: string[] = [];
  let score = 1;

  if (image.width < MIN_WIDTH || image.height < MIN_HEIGHT) {
    issues.push('Độ phân giải quá thấp — hãy đưa mặt gần camera hơn');
    score -= 0.35;
  }

  const aspect = image.width / image.height;
  if (aspect < 0.5 || aspect > 1.2) {
    issues.push('Khung hình không phù hợp — giữ mặt ở giữa khung oval');
    score -= 0.2;
  }

  if (!image.uri) {
    issues.push('Không đọc được ảnh');
    score = 0;
  }

  // Mock: URI quá ngắn thường là lỗi capture
  if (image.uri && image.uri.length < 10) {
    issues.push('Ảnh không hợp lệ');
    score -= 0.5;
  }

  score = Math.max(0, Math.min(1, score));

  return {
    isValid: score >= MIN_SCORE && issues.length === 0,
    score,
    issues,
  };
}

/** Alias dùng trong UI — client-side pre-validation trước khi gọi API */
export const validateFaceImage = checkFaceImageQuality;

export function formatFaceStatusLabel(status: string): string {
  switch (status) {
    case 'enrolled':
      return 'Đã đăng ký';
    case 'revoked':
      return 'Đã thu hồi';
    default:
      return 'Chưa đăng ký';
  }
}
