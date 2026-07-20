import type { TenantInvitation } from '../types/Profile';

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
