import { isAxiosError } from 'axios';

/**
 * Parses an unknown error thrown by an auth API call into a
 * user-facing Vietnamese error string.
 */
export function parseAuthError(error: unknown): string {
  if (!isAxiosError(error)) return 'Đã có lỗi xảy ra. Vui lòng thử lại';

  const data = error.response?.data as Record<string, unknown> | undefined;
  const status = error.response?.status;

  // Account locked – brute-force protection
  if (status === 423 || data?.error_code === 'ACCOUNT_LOCKED') {
    const lockedUntil = data?.locked_until as string | undefined;
    if (lockedUntil) {
      const date = new Date(lockedUntil);
      const time = date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `Tài khoản tạm khóa đến ${time}. Vui lòng thử lại sau`;
    }
    return 'Tài khoản tạm bị khóa do đăng nhập sai nhiều lần';
  }

  // Server supplied an explicit message
  if (typeof data?.message === 'string') return data.message;

  if (!error.response) return 'Không thể kết nối đến máy chủ';

  switch (status) {
    case 400: return 'Thông tin không hợp lệ';
    case 401: return 'Email hoặc mật khẩu không đúng';
    case 403: return 'Tài khoản không có quyền truy cập';
    case 404: return 'Không tìm thấy tài khoản';
    case 429: return 'Quá nhiều lần thử. Vui lòng đợi vài phút';
    case 500:
    case 502:
    case 503: return 'Lỗi máy chủ. Vui lòng thử lại sau';
    default: return `Lỗi không xác định (${status ?? 'unknown'})`;
  }
}

/** Formats seconds into MM:SS display string for OTP countdown */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
