// ─── Invitations ──────────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  tenant_name: string;
  invited_by_name: string;
  role: string;
  message?: string;
  expires_at: string;
  status: InvitationStatus;
  created_at: string;
}

/** Response phân trang thật của GET /tenants/{tenantId}/invitations (theo Swagger) */
export interface TenantInvitationListResponse {
  content: TenantInvitation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ─── Profile store ──────────────────────────────────────────────────────────────

export interface ProfileState {
  pendingInvitations: TenantInvitation[];
}

export interface ProfileActions {
  setPendingInvitations: (invitations: TenantInvitation[]) => void;
  removeInvitation: (id: string) => void;
}
