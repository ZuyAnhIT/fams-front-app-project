import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  FaceIdStatusDto,
  FaceImagePayload,
  FaceVerifyResultDto,
  FaceVerifySubmitResponse,
} from '../types/FaceId';

function faceIdBase(tenantId: string, employeeId: string): string {
  return `/tenants/${tenantId}/employees/${employeeId}/face-id`;
}

export async function getFaceIdStatus(
  tenantId: string,
  employeeId: string,
): Promise<FaceIdStatusDto> {
  const { data } = await apiClient.get(faceIdBase(tenantId, employeeId));
  return unwrapApiData<FaceIdStatusDto>(data);
}

export async function saveFaceIdConsent(
  tenantId: string,
  employeeId: string,
): Promise<FaceIdStatusDto> {
  const { data } = await apiClient.post(`${faceIdBase(tenantId, employeeId)}/consent`);
  return unwrapApiData<FaceIdStatusDto>(data);
}

export async function enrollFaceId(
  tenantId: string,
  employeeId: string,
  images: FaceImagePayload[],
): Promise<FaceIdStatusDto> {
  const formData = new FormData();
  images.forEach((image, index) => {
    formData.append('photos', {
      uri: image.uri,
      type: 'image/jpeg',
      name: `face-${index}.jpg`,
    } as unknown as Blob);
  });

  const { data } = await apiClient.post(`${faceIdBase(tenantId, employeeId)}/enroll`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapApiData<FaceIdStatusDto>(data);
}

export async function revokeFaceId(
  tenantId: string,
  employeeId: string,
): Promise<FaceIdStatusDto> {
  const { data } = await apiClient.delete(faceIdBase(tenantId, employeeId));
  return unwrapApiData<FaceIdStatusDto>(data);
}

export async function submitFaceVerify(
  tenantId: string,
  employeeId: string,
  photoBase64: string,
  requiresLiveness: boolean,
): Promise<FaceVerifySubmitResponse> {
  const { data } = await apiClient.post(`${faceIdBase(tenantId, employeeId)}/verify`, {
    photoBase64,
    requiresLiveness,
  });
  return unwrapApiData<FaceVerifySubmitResponse>(data);
}

export async function getFaceVerifyResult(
  tenantId: string,
  employeeId: string,
  verifyRequestId: string,
): Promise<FaceVerifyResultDto> {
  const { data } = await apiClient.get(
    `${faceIdBase(tenantId, employeeId)}/verify/${verifyRequestId}`,
  );
  return unwrapApiData<FaceVerifyResultDto>(data);
}
