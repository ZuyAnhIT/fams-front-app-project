import { isAxiosError } from 'axios';

/** Parses ISO date from backend locked-account messages */
function parseLockedUntilFromMessage(message: string): string | undefined {
  const match = message.match(/locked until (.+)$/i);
  return match?.[1]?.trim();
}

/** Remaining lock duration in Vietnamese */
export function formatLockRemaining(lockedUntil: string): string {
  const diffMs = new Date(lockedUntil).getTime() - Date.now();
  if (diffMs <= 0) return 'sắp được mở khóa';

  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} phút`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

/**
 * Parses an unknown error thrown by an auth API call into a
 * user-facing Vietnamese error string.
 */
export function parseAuthError(error: unknown): string {
  if (error instanceof Error && !isAxiosError(error)) {
    return error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại';
  }
  if (!isAxiosError(error)) return 'Đã có lỗi xảy ra. Vui lòng thử lại';

  const data = error.response?.data as Record<string, unknown> | undefined;
  const status = error.response?.status;
  const serverMessage = typeof data?.message === 'string' ? data.message : '';

  // Account locked – HTTP 423 or message pattern from Spring Boot
  if (
    status === 423 ||
    data?.error_code === 'ACCOUNT_LOCKED' ||
    /account locked/i.test(serverMessage)
  ) {
    const lockedUntil =
      (data?.locked_until as string | undefined) ??
      parseLockedUntilFromMessage(serverMessage);

    if (lockedUntil) {
      const time = new Date(lockedUntil).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
      const remaining = formatLockRemaining(lockedUntil);
      return `Tài khoản tạm khóa đến ${time} (còn ${remaining}). Vui lòng thử lại sau hoặc liên hệ quản trị viên.`;
    }
    return 'Tài khoản tạm bị khóa do đăng nhập sai nhiều lần. Vui lòng đợi 15 phút rồi thử lại.';
  }

  // Validation field errors from Spring Boot
  const fieldErrors = data?.data;
  if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
    const messages = Object.values(fieldErrors as Record<string, string>).filter(Boolean);
    if (messages.length > 0) return messages.join('. ');
  }

  if (serverMessage && serverMessage !== 'Validation failed') {
    return serverMessage;
  }
  if (serverMessage === 'Validation failed') {
    return 'Thông tin không hợp lệ. Vui lòng kiểm tra lại';
  }

  if (!error.response) return 'Không thể kết nối đến máy chủ';

  switch (status) {
    case 400:
      return 'Thông tin không hợp lệ';
    case 401:
      return 'Email hoặc mật khẩu không đúng';
    case 403:
      return 'Tài khoản không có quyền truy cập';
    case 404:
      return 'Không tìm thấy tài khoản';
    case 409:
      return 'Email hoặc số điện thoại này đã được sử dụng';
    case 422:
      return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại';
    case 429:
      return 'Quá nhiều lần thử. Vui lòng đợi vài phút';
    case 500:
    case 502:
    case 503:
      return 'Lỗi máy chủ. Vui lòng thử lại sau';
    default:
      return `Lỗi không xác định (${status ?? 'unknown'})`;
  }
}

/** Converts VN local phone (0xxxxxxxxx) to E.164 (+84xxxxxxxxx) for the backend. */
export function normalizePhoneForBackend(phone: string): string {
  const digits = phone.trim().replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  if (digits.startsWith('84')) return `+${digits}`;
  return digits;
}

/** Formats seconds into MM:SS display string for OTP countdown */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Whether an axios error represents a temporarily locked account */
export function isAccountLockedError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const message = typeof data?.message === 'string' ? data.message : '';
  return error.response?.status === 423 || /account locked/i.test(message);
}

/** Extract locked_until ISO string from a locked-account error, if present */
export function getLockedUntil(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const message = typeof data?.message === 'string' ? data.message : '';
  return (
    (data?.locked_until as string | undefined) ?? parseLockedUntilFromMessage(message)
  );
}
