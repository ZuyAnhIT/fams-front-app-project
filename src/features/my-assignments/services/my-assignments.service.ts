import { isAxiosError } from 'axios';

import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type { MyAssignment } from '../types/my-assignment.type';

/** 404 = chưa có employee profile trong tenant này (trạng thái hợp lệ, không phải lỗi) —
 *  trả về mảng rỗng thay vì throw, cùng cách xử lý với getCurrentEmployeeId. */
export async function getMyAssignments(tenantId: string): Promise<MyAssignment[]> {
  try {
    const { data } = await apiClient.get(`/tenants/${tenantId}/assignments/me`);
    return unwrapApiData<MyAssignment[]>(data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}
