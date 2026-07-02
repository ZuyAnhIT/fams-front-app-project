import type { TenantInvitation } from '../types/Profile';

export function parseProfileError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export function isInvitationExpired(invitation: TenantInvitation): boolean {
  return new Date(invitation.expires_at) < new Date();
}

export function formatInvitationExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
