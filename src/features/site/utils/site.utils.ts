import { isAxiosError } from 'axios';

import type { SiteStatus } from '../types/Site';

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
};

export const SITE_STATUS_FILTER_OPTIONS: { value: SiteStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Ngừng hoạt động' },
];

export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return 'Chưa xác định tọa độ';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function formatGeofenceRadius(bufferMeters: number): string {
  return `Bán kính ${bufferMeters}m`;
}

export function formatShiftTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export function parseSiteError(error: unknown): string {
  if (error instanceof Error && !isAxiosError(error)) {
    return error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại';
  }
  if (!isAxiosError(error)) return 'Đã có lỗi xảy ra. Vui lòng thử lại';

  if (!error.response) return 'Không thể kết nối đến máy chủ';

  const status = error.response.status;
  switch (status) {
    case 400:
      return 'Thông tin công trình không hợp lệ';
    case 401:
      return 'Bạn cần đăng nhập lại';
    case 403:
      return 'Bạn không có quyền xem công trình này';
    case 404:
      return 'Không tìm thấy công trình';
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
