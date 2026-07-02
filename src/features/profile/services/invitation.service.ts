import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type { AcceptInvitationResponse, TenantInvitation } from '../types/Profile';

const BASE = '/profile/invitations';

export async function getPendingInvitations(): Promise<TenantInvitation[]> {
  const { data } = await apiClient.get(`${BASE}/pending`);
  return unwrapApiData<TenantInvitation[]>(data);
}

export async function acceptInvitation(id: string): Promise<AcceptInvitationResponse> {
  const { data } = await apiClient.post(`${BASE}/${id}/accept`);
  return unwrapApiData<AcceptInvitationResponse>(data);
}

export async function declineInvitation(id: string): Promise<TenantInvitation> {
  const { data } = await apiClient.post(`${BASE}/${id}/decline`);
  return unwrapApiData<TenantInvitation>(data);
}
