import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { FACE_ID_ARCFACE_ROLLOUT_AT } from '@/config/env';

import type { FaceIdStatusDto, FaceImagePayload } from '../types/FaceId';
import { FACE_MAX_PHOTOS, FACE_MIN_PHOTOS } from './face-quality';

const MAX_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1280;
const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.15;

export function requiresFaceIdReEnrollment(
  faceStatus: FaceIdStatusDto | undefined,
): boolean {
  if (!faceStatus || faceStatus.status !== 'enrolled') return false;
  if (typeof faceStatus.requiresReEnrollment === 'boolean') {
    return faceStatus.requiresReEnrollment;
  }
  if (faceStatus.embeddingModel) {
    return faceStatus.embeddingModel !== 'arcface_512';
  }
  if (!faceStatus.enrolledAt) return false;

  const enrolledAt = Date.parse(faceStatus.enrolledAt);
  const rolloutAt = Date.parse(FACE_ID_ARCFACE_ROLLOUT_AT);
  return Number.isFinite(enrolledAt) && enrolledAt < rolloutAt;
}

async function getFileSizeBytes(uri: string): Promise<number> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

/**
 * Resize + nén ảnh xuống dưới 1MB, đồng thời convert mọi định dạng (kể cả
 * HEIC) sang JPEG — backend không hỗ trợ HEIC và trả lỗi 500 không rõ
 * nguyên nhân nếu bỏ qua bước này.
 */
export async function prepareFaceImageForUpload(uri: string): Promise<FaceImagePayload> {
  let quality = 0.8;
  let result = await manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: quality,
    format: SaveFormat.JPEG,
  });
  let size = await getFileSizeBytes(result.uri);

  while (size > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP;
    result = await manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    size = await getFileSizeBytes(result.uri);
  }

  return { uri: result.uri, width: result.width, height: result.height };
}

const VERIFY_MAX_DIMENSION = 960;
const VERIFY_QUALITY = 0.7;

/**
 * Resize + convert 1 ảnh sang JPEG base64 để gửi POST /face-id/verify
 * (photoBase64). Verify chỉ dùng 1 ảnh nên không cần vòng lặp nén như enroll.
 */
export async function prepareFaceImageBase64(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: VERIFY_MAX_DIMENSION } }], {
    compress: VERIFY_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('Không thể chuyển đổi ảnh sang base64');
  }

  return result.base64;
}

export function validateFaceIdPhotoCount(count: number): string | null {
  if (count < FACE_MIN_PHOTOS || count > FACE_MAX_PHOTOS) {
    return `Cần chụp từ ${FACE_MIN_PHOTOS} đến ${FACE_MAX_PHOTOS} ảnh (hiện có ${count} ảnh).`;
  }
  return null;
}

interface FaceIdApiErrorBody {
  success: false;
  message: string;
  errorCode?: string;
  userMessage?: string;
}

export function getFaceIdErrorCode(error: unknown): string {
  const body = (error as { response?: { data?: FaceIdApiErrorBody } })?.response?.data;
  return body?.errorCode ?? '';
}

const AI_ERROR_LABELS: Record<string, string> = {
  no_face_detected:
    'Không phát hiện khuôn mặt trong ảnh. Vui lòng chụp lại toàn bộ ảnh, đảm bảo khuôn mặt nằm trong khung.',
  multiple_faces_detected:
    'Phát hiện nhiều khuôn mặt trong ảnh. Vui lòng chụp lại toàn bộ ảnh, chỉ có một người trong khung hình.',
};

const GENERIC_ERROR_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại';

/** true nếu lỗi là do AI không nhận diện được khuôn mặt hợp lệ trong ảnh — buộc chụp lại toàn bộ batch. */
export function isFaceIdDetectionError(error: unknown): boolean {
  const body = (error as { response?: { data?: FaceIdApiErrorBody } })?.response?.data;
  return body?.errorCode === 'AI_SERVICE_ERROR';
}

/**
 * Parse lỗi từ API Face-ID. Với AI_SERVICE_ERROR, message là chuỗi JSON lồng
 * (vd. {"detail":"no_face_detected"}) — không hiển thị message thô ra UI.
 */
export function parseFaceIdError(error: unknown): string {
  const body = (error as { response?: { data?: FaceIdApiErrorBody } })?.response?.data;
  if (!body) return GENERIC_ERROR_MESSAGE;

  if (body.errorCode === 'AI_SERVICE_ERROR' && typeof body.message === 'string') {
    try {
      const detail = (JSON.parse(body.message) as { detail?: string }).detail;
      if (detail && AI_ERROR_LABELS[detail]) {
        return AI_ERROR_LABELS[detail];
      }
    } catch {
      // message không phải JSON hợp lệ — rơi xuống fallback chung
    }
    return GENERIC_ERROR_MESSAGE;
  }

  if (body.errorCode === 'INVALID_ARGUMENT') {
    return body.userMessage ?? body.message ?? GENERIC_ERROR_MESSAGE;
  }

  if (body.errorCode === 'FACE_ID_REQUIRED') {
    return 'Công trình này yêu cầu xác thực khuôn mặt chủ động trước khi chấm công.';
  }
  if (body.errorCode === 'FACE_ID_NOT_ENROLLED') {
    return 'Bạn chưa có Face ID đã được duyệt. Vui lòng đăng ký Face ID trước.';
  }
  if (body.errorCode === 'TOO_MANY_ATTEMPTS') {
    return (
      body.userMessage ??
      'Bạn đã thử xác thực khuôn mặt quá nhiều lần. Vui lòng thử lại sau 10 phút.'
    );
  }
  if (body.errorCode === 'DUPLICATE_RESOURCE' || body.message?.includes('pending review')) {
    return 'Bạn đang có một lượt đăng ký chờ HR duyệt. Vui lòng đợi kết quả trước khi gửi lại.';
  }

  return body.userMessage ?? body.message ?? GENERIC_ERROR_MESSAGE;
}
