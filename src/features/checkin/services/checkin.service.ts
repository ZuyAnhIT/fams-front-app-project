import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  AvailableSite,
  CheckinHistoryParams,
  CheckinHistoryResponse,
  CheckinResponse,
  ExplanationResponse,
  OfflineCheckinRequest,
  OfflineSyncResultItem,
  SubmitCheckinRequest,
  SubmitCheckoutRequest,
  SubmitExplanationRequest,
} from '../types/checkin.type';

function checkinBase(tenantId: string): string {
  return `/tenants/${tenantId}/checkin`;
}

export async function getAvailableSites(tenantId: string): Promise<AvailableSite[]> {
  const { data } = await apiClient.get(`${checkinBase(tenantId)}/available-sites`);
  return unwrapApiData<AvailableSite[]>(data);
}

export async function submitCheckin(
  tenantId: string,
  payload: SubmitCheckinRequest,
): Promise<CheckinResponse> {
  const { data } = await apiClient.post(checkinBase(tenantId), payload);
  return unwrapApiData<CheckinResponse>(data);
}

export async function submitCheckout(
  tenantId: string,
  checkinId: string,
  payload: SubmitCheckoutRequest,
): Promise<CheckinResponse> {
  const { data } = await apiClient.post(
    `${checkinBase(tenantId)}/${checkinId}/checkout`,
    payload,
  );
  return unwrapApiData<CheckinResponse>(data);
}

export async function syncOfflineCheckins(
  tenantId: string,
  payload: OfflineCheckinRequest[],
): Promise<OfflineSyncResultItem[]> {
  const { data } = await apiClient.post(`${checkinBase(tenantId)}/sync`, payload);
  return unwrapApiData<OfflineSyncResultItem[]>(data);
}

export async function getCheckinResult(
  tenantId: string,
  checkinId: string,
): Promise<CheckinResponse> {
  const { data } = await apiClient.get(`${checkinBase(tenantId)}/${checkinId}`);
  return unwrapApiData<CheckinResponse>(data);
}

export async function getCheckinHistory(
  tenantId: string,
  params?: CheckinHistoryParams,
): Promise<CheckinHistoryResponse> {
  const { data } = await apiClient.get(`${checkinBase(tenantId)}/history`, { params });
  return unwrapApiData<CheckinHistoryResponse>(data);
}

export async function submitExplanation(
  tenantId: string,
  checkinId: string,
  payload: SubmitExplanationRequest,
): Promise<ExplanationResponse> {
  const { data } = await apiClient.post(
    `${checkinBase(tenantId)}/${checkinId}/explain`,
    payload,
  );
  return unwrapApiData<ExplanationResponse>(data);
}
