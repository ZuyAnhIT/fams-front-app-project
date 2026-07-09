import { isAxiosError } from 'axios';

import type { AssignmentRole, AssignmentStatus } from '../types/assignment.type';

/** Chỉ 2 giá trị thật ở backend — không có lead/safety_officer/engineer/security/manager. */
export const ASSIGNMENT_ROLE_LABELS: Record<AssignmentRole, string> = {
  worker: 'Nhân viên',
  supervisor: 'Giám sát',
};

export const ASSIGNMENT_ROLE_FILTER_OPTIONS: { value: AssignmentRole | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả vai trò' },
  { value: 'worker', label: 'Nhân viên' },
  { value: 'supervisor', label: 'Giám sát' },
];

/** Chỉ 2 giá trị thật ở backend — không có planned/completed. */
export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: 'Đang hoạt động',
  cancelled: 'Đã huỷ',
};

export const ASSIGNMENT_STATUS_FILTER_OPTIONS: {
  value: AssignmentStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

export function formatAssignmentDateRange(startDate: string, endDate: string | null): string {
  return endDate ? `${startDate} → ${endDate}` : `${startDate} → hiện tại`;
}

export function parseAssignmentError(error: unknown): string {
  if (error instanceof Error && !isAxiosError(error)) {
    return error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại';
  }
  if (!isAxiosError(error)) return 'Đã có lỗi xảy ra. Vui lòng thử lại';

  if (!error.response) return 'Không thể kết nối đến máy chủ';

  const status = error.response.status;
  switch (status) {
    case 400:
      return 'Thông tin lọc phân công không hợp lệ';
    case 401:
      return 'Bạn cần đăng nhập lại';
    case 403:
      return 'Bạn không có quyền xem phân công của site này';
    case 404:
      return 'Không tìm thấy site hoặc phân công';
    case 422:
      return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại';
    case 429:
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
    case 500:
    case 502:
    case 503:
      return 'Lỗi máy chủ. Vui lòng thử lại sau';
    default:
      return `Lỗi không xác định (${status ?? 'unknown'})`;
  }
}
