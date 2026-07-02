// ─── Face ID ──────────────────────────────────────────────────────────────────

export type FaceEnrollmentStatus =
  | 'not_registered'
  | 'consent_pending'
  | 'registered'
  | 'revoked';

export interface FaceStatusResponse {
  status: FaceEnrollmentStatus;
  consent_given: boolean;
  consent_version?: string;
  consent_at?: string;
  registered_at?: string;
  photo_count: number;
  quality_score?: number;
  last_updated_at?: string;
}

export interface SaveConsentRequest {
  accepted: boolean;
  consent_version: string;
}

export interface SaveConsentResponse {
  consent_given: boolean;
  consent_at: string;
  consent_version: string;
}

export interface FaceImagePayload {
  uri: string;
  width: number;
  height: number;
}

export interface RegisterFaceRequest {
  images: FaceImagePayload[];
}

export interface RegisterFaceResponse {
  status: FaceEnrollmentStatus;
  photo_count: number;
  quality_score: number;
  registered_at: string;
}

export interface DeleteFaceResponse {
  status: FaceEnrollmentStatus;
  deleted_at: string;
}

export interface FaceQualityResult {
  isValid: boolean;
  score: number;
  issues: string[];
}

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

export interface AcceptInvitationResponse {
  invitation: TenantInvitation;
  message: string;
}

// ─── Profile store ──────────────────────────────────────────────────────────────

export interface CapturedFacePhoto {
  uri: string;
  width: number;
  height: number;
  quality: FaceQualityResult;
  capturedAt: string;
}

export interface FaceEnrollSession {
  photos: CapturedFacePhoto[];
  currentStep: number;
  consentAccepted: boolean;
}

export interface ProfileState {
  enrollSession: FaceEnrollSession | null;
  pendingInvitations: TenantInvitation[];
}

export interface ProfileActions {
  startEnrollSession: () => void;
  addCapturedPhoto: (photo: CapturedFacePhoto) => void;
  removeLastPhoto: () => void;
  setConsentAccepted: (accepted: boolean) => void;
  clearEnrollSession: () => void;
  setPendingInvitations: (invitations: TenantInvitation[]) => void;
  removeInvitation: (id: string) => void;
}
