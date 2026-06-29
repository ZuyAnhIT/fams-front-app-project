import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  DeleteFaceResponse,
  FaceImagePayload,
  FaceQualityResult,
  FaceStatusResponse,
  RegisterFaceRequest,
  RegisterFaceResponse,
  SaveConsentRequest,
  SaveConsentResponse,
} from '../types';
import { checkFaceImageQuality } from '../utils/face-quality';

const BASE = '/profile/face';

/**
 * Face ID service — gọi qua apiClient (mock handler khi EXPO_PUBLIC_USE_MOCK_API=true).
 *
 * Khi backend sẵn sàng: giữ nguyên các hàm, tắt mock — axios sẽ hit API thật.
 */

export async function getFaceStatus(): Promise<FaceStatusResponse> {
  const { data } = await apiClient.get(`${BASE}/status`);
  return unwrapApiData<FaceStatusResponse>(data);
}

export async function saveConsent(body: SaveConsentRequest): Promise<SaveConsentResponse> {
  const { data } = await apiClient.post(`${BASE}/consent`, body);
  return unwrapApiData<SaveConsentResponse>(data);
}

export async function registerFace(images: FaceImagePayload[]): Promise<RegisterFaceResponse> {
  const payload: RegisterFaceRequest = { images };
  const { data } = await apiClient.post(`${BASE}/register`, payload);
  return unwrapApiData<RegisterFaceResponse>(data);
}

export async function deleteFace(): Promise<DeleteFaceResponse> {
  const { data } = await apiClient.delete(BASE);
  return unwrapApiData<DeleteFaceResponse>(data);
}

/** Client-side quality check — có thể giữ khi đã có API (pre-validation UX) */
export function validateFaceImage(image: FaceImagePayload): FaceQualityResult {
  return checkFaceImageQuality(image);
}
