import { isAxiosError } from 'axios';

import type {
  AvailableSite,
  CheckinAvailabilityStatus,
  CheckinShiftInfo,
} from '../types/checkin.type';

export const ASSIGNMENT_ROLE_LABELS: Record<AvailableSite['assignmentRole'], string> = {
  worker: 'Nhân viên',
  supervisor: 'Giám sát',
};

export const AVAILABILITY_LABELS: Record<CheckinAvailabilityStatus, string> = {
  unrestricted: 'Không giới hạn giờ',
  upcoming: 'Sắp diễn ra',
  open: 'Có thể chấm công',
  closed: 'Đã kết thúc',
};

/** Backend serializes LocalTime as HH:mm:ss; the mobile UI only needs HH:mm. */
export function formatShiftTime(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}

export function formatShiftSchedule(shift: CheckinShiftInfo): string {
  const suffix = shift.allowOvernight ? ' · qua ngày hôm sau' : '';
  return `${formatShiftTime(shift.startTime)}–${formatShiftTime(shift.endTime)}${suffix}`;
}

export function formatAvailableSiteSchedule(site: AvailableSite): string {
  if (!site.shift) {
    return 'Không gắn ca cụ thể';
  }

  return `${site.shift.name} · ${formatShiftSchedule(site.shift)}`;
}

const AVAILABILITY_PRIORITY: Record<CheckinAvailabilityStatus, number> = {
  open: 0,
  unrestricted: 0,
  upcoming: 1,
  closed: 2,
};

/** Put actionable work first while preserving backend order inside each group. */
export function sortAvailableSites(sites: AvailableSite[]): AvailableSite[] {
  return sites
    .map((site, index) => ({ site, index }))
    .sort((a, b) => {
      const priority =
        AVAILABILITY_PRIORITY[a.site.availabilityStatus] -
        AVAILABILITY_PRIORITY[b.site.availabilityStatus];
      if (priority !== 0) return priority;

      const aFrom = a.site.checkinAllowedFrom
        ? Date.parse(a.site.checkinAllowedFrom)
        : Number.NEGATIVE_INFINITY;
      const bFrom = b.site.checkinAllowedFrom
        ? Date.parse(b.site.checkinAllowedFrom)
        : Number.NEGATIVE_INFINITY;
      if (Number.isFinite(aFrom) && Number.isFinite(bFrom) && aFrom !== bFrom) {
        return aFrom - bFrom;
      }
      return a.index - b.index;
    })
    .map(({ site }) => site);
}

/**
 * Advance the backend clock only by elapsed client time. A consistently wrong
 * device clock therefore does not affect the resulting availability state.
 */
export function getEstimatedServerNow(
  site: AvailableSite,
  clientNowMs: number,
  dataUpdatedAtMs: number,
): number | null {
  const serverNowMs = Date.parse(site.serverNow);
  if (!Number.isFinite(serverNowMs)) return null;

  const elapsedMs =
    dataUpdatedAtMs > 0 ? Math.max(0, clientNowMs - dataUpdatedAtMs) : 0;
  return serverNowMs + elapsedMs;
}

export function getEffectiveAvailabilityStatus(
  site: AvailableSite,
  clientNowMs: number,
  dataUpdatedAtMs: number,
): CheckinAvailabilityStatus {
  if (
    site.availabilityStatus === 'unrestricted' ||
    !site.checkinAllowedFrom ||
    !site.checkinAllowedUntil
  ) {
    return site.availabilityStatus;
  }

  const estimatedNow = getEstimatedServerNow(site, clientNowMs, dataUpdatedAtMs);
  const allowedFrom = Date.parse(site.checkinAllowedFrom);
  const allowedUntil = Date.parse(site.checkinAllowedUntil);
  if (
    estimatedNow === null ||
    !Number.isFinite(allowedFrom) ||
    !Number.isFinite(allowedUntil)
  ) {
    return site.availabilityStatus;
  }

  if (estimatedNow < allowedFrom) return 'upcoming';
  if (estimatedNow < allowedUntil) return 'open';
  return 'closed';
}

export function canCheckinAtSite(status: CheckinAvailabilityStatus): boolean {
  return status === 'open' || status === 'unrestricted';
}

export function formatAvailabilityInstant(
  value: string | null,
  timezone: string | null,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone ?? undefined,
    }).format(date);
  } catch {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatCountdown(
  target: string | null,
  site: AvailableSite,
  clientNowMs: number,
  dataUpdatedAtMs: number,
): string | null {
  if (!target) return null;
  const targetMs = Date.parse(target);
  const estimatedNow = getEstimatedServerNow(site, clientNowMs, dataUpdatedAtMs);
  if (!Number.isFinite(targetMs) || estimatedNow === null) return null;

  const remainingMinutes = Math.max(0, Math.ceil((targetMs - estimatedNow) / 60_000));
  if (remainingMinutes < 60) return `${remainingMinutes} phút`;

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  if (hours < 24) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} ngày ${remainingHours} giờ` : `${days} ngày`;
}

export function getAvailabilityDescription(
  site: AvailableSite,
  status: CheckinAvailabilityStatus,
  clientNowMs: number,
  dataUpdatedAtMs: number,
): string {
  const timezone = site.site.timezone;
  if (status === 'unrestricted') {
    return 'Có thể chấm công trong ngày';
  }
  if (status === 'upcoming') {
    const allowedFrom = formatAvailabilityInstant(site.checkinAllowedFrom, timezone);
    const countdown = formatCountdown(
      site.checkinAllowedFrom,
      site,
      clientNowMs,
      dataUpdatedAtMs,
    );
    return [
      allowedFrom ? `Chấm công từ ${allowedFrom}` : 'Chưa đến giờ chấm công',
      countdown ? `còn ${countdown}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (status === 'open') {
    const allowedUntil = formatAvailabilityInstant(site.checkinAllowedUntil, timezone);
    return allowedUntil
      ? `Đang trong cửa sổ chấm công · đến ${allowedUntil}`
      : 'Đang trong cửa sổ chấm công';
  }

  const allowedUntil = formatAvailabilityInstant(site.checkinAllowedUntil, timezone);
  return allowedUntil ? `Ca đã kết thúc lúc ${allowedUntil}` : 'Ca đã kết thúc';
}

function getCheckinErrorCode(data: Record<string, unknown> | undefined): string {
  return typeof data?.errorCode === 'string' ? data.errorCode : '';
}

function formatOpenCheckinConflict(serverMessage: string): string {
  const timeMatch = serverMessage.match(/checked in at ([^)]+)\)/i);
  const checkedInAt = timeMatch?.[1] ? new Date(timeMatch[1]) : null;
  const timeLabel =
    checkedInAt && !Number.isNaN(checkedInAt.getTime())
      ? checkedInAt.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        })
      : null;

  return timeLabel
    ? `Bạn đang có phiên chấm công mở từ ${timeLabel}. Hãy check-out trước khi bắt đầu ca khác.`
    : 'Bạn đang có phiên chấm công chưa hoàn tất. Hãy check-out trước khi bắt đầu ca khác.';
}

export function parseCheckinError(
  error: unknown,
  fallback = 'Không thể thực hiện chấm công. Vui lòng thử lại.',
): string {
  if (!isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  if (!error.response) {
    return 'Không thể kết nối đến máy chủ. Kiểm tra mạng rồi thử lại.';
  }

  const data = error.response.data as Record<string, unknown> | undefined;
  const userMessage =
    typeof data?.userMessage === 'string' ? data.userMessage.trim() : '';
  const serverMessage =
    typeof data?.message === 'string' ? data.message.trim() : '';
  const errorCode = getCheckinErrorCode(data);

  // The shared backend message for every duplicate is intentionally generic;
  // check-in needs the technical message here to recover the open-session time.
  if (errorCode === 'DUPLICATE_RESOURCE') {
    return formatOpenCheckinConflict(serverMessage);
  }

  if (userMessage) return userMessage;

  switch (errorCode) {
    case 'EMPLOYEE_NOT_ACTIVE':
      return 'Tài khoản nhân viên hiện không hoạt động. Vui lòng liên hệ HR hoặc quản lý.';
    case 'SITE_INACTIVE':
      return 'Công trình này hiện không hoạt động. Vui lòng liên hệ quản lý.';
    case 'CHECKIN_TOO_EARLY':
      return serverMessage || 'Chưa đến giờ được phép chấm công.';
    case 'CHECKIN_TOO_LATE':
      return 'Ca làm việc đã kết thúc, không thể chấm công.';
    case 'FACE_ID_REQUIRED':
      return 'Công trình này yêu cầu xác thực khuôn mặt chủ động trước khi chấm công.';
    case 'FACE_ID_NOT_ENROLLED':
      return 'Bạn chưa có Face ID đã được duyệt. Vui lòng đăng ký Face ID trước.';
  }

  switch (error.response.status) {
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Bạn chưa được cấp quyền chấm công trong công ty này.';
    case 404:
      return 'Không tìm thấy phân công còn hiệu lực cho công trình này hôm nay.';
    case 409:
      return formatOpenCheckinConflict(serverMessage);
    case 422:
      return serverMessage || 'Thời điểm hoặc dữ liệu chấm công chưa hợp lệ.';
    case 429:
      return 'Bạn thao tác quá nhiều lần. Vui lòng đợi rồi thử lại.';
    case 500:
    case 502:
    case 503:
      return 'Máy chủ chấm công đang gặp sự cố. Vui lòng thử lại sau.';
    default:
      return serverMessage || fallback;
  }
}
