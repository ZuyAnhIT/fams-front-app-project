import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  ExceptionExplanationResponse,
  MyExceptionItem,
  SubmitExceptionExplanationRequest,
} from '../types/exception.type';

export async function getMyExceptions(
  tenantId: string,
  size = 50,
): Promise<MyExceptionItem[]> {
  const { data } = await apiClient.get(`/tenants/${tenantId}/me/exceptions`, {
    params: { size },
  });
  return unwrapApiData<MyExceptionItem[]>(data);
}

function normalizeExplainEndpoint(endpoint: string, tenantId: string): string {
  const expectedPrefix = `/api/v1/tenants/${tenantId}/`;
  if (!endpoint.startsWith(expectedPrefix)) {
    throw new Error('Invalid explanation endpoint returned by server');
  }
  // apiClient.baseURL already ends in /api/v1. Keep the endpoint server-driven,
  // but remove that shared prefix to avoid /api/v1/api/v1 duplication.
  return endpoint.slice('/api/v1'.length);
}

export async function submitExceptionExplanation(
  tenantId: string,
  explainEndpoint: string,
  payload: SubmitExceptionExplanationRequest,
): Promise<ExceptionExplanationResponse> {
  const body = payload.photo ? (() => {
    const formData = new FormData();
    formData.append('note', payload.note);
    formData.append('photo', payload.photo as unknown as Blob);
    return formData;
  })() : { note: payload.note };
  const { data } = await apiClient.post(
    normalizeExplainEndpoint(explainEndpoint, tenantId),
    body,
    payload.photo ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
  );
  return unwrapApiData<ExceptionExplanationResponse>(data);
}
