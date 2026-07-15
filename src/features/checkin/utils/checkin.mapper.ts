import type { CheckinStatus } from '../types/checkin.type';

export const CHECKIN_STATUS_LABELS: Record<CheckinStatus, string> = {
  valid: 'Hợp lệ',
  pending_review: 'Chờ duyệt',
  rejected: 'Không hợp lệ',
};

export const CHECKIN_STATUS_COLORS: Record<CheckinStatus, string> = {
  valid: '#16A34A',
  pending_review: '#D97706',
  rejected: '#DC2626',
};

/** Haversine — chỉ dùng cho gợi ý UX trước khi gửi, không thay thế validate của backend. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatWorkMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} phút`;
  return `${hours} giờ ${rest} phút`;
}
