import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type { TenantInvitationListResponse } from '../types/Profile';

/**
 * Chỉ có GET (list) là endpoint thật xác nhận được cho user đã đăng nhập.
 * Accept/decline cho danh sách pending invitations trong Profile CHƯA có endpoint
 * riêng — POST /invitations/accept là flow khác (email token, user chưa có tài
 * khoản, trả JWT mới). Cần xác nhận thêm với backend trước khi bật lại 2 hành
 * động này cho user đã đăng nhập (xem use-invitation.ts).
 */
export async function getPendingInvitations(tenantId: string): Promise<TenantInvitationListResponse> {
  const { data } = await apiClient.get(`/tenants/${tenantId}/invitations`, {
    params: { status: 'pending' },
  });
  return unwrapApiData<TenantInvitationListResponse>(data);
}
