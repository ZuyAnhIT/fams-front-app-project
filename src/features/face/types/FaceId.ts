export type FaceIdStatus = 'not_enrolled' | 'pending' | 'enrolled' | 'revoked';

export interface FaceIdStatusDto {
  status: FaceIdStatus;
  consentGiven: boolean;
  consentGivenAt: string | null;
  enrolledAt: string | null;
  revokedAt: string | null;
}

export interface FaceImagePayload {
  uri: string;
  width: number;
  height: number;
}

export interface FaceQualityResult {
  isValid: boolean;
  score: number;
  issues: string[];
}

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

export interface FaceEnrollState {
  enrollSession: FaceEnrollSession | null;
}

export interface FaceEnrollActions {
  startEnrollSession: () => void;
  addCapturedPhoto: (photo: CapturedFacePhoto) => void;
  removeLastPhoto: () => void;
  setConsentAccepted: (accepted: boolean) => void;
  clearEnrollSession: () => void;
}

// ─── Face Verify ──────────────────────────────────────────────────────────────

export interface FaceVerifySubmitRequest {
  photoBase64: string;
  requiresLiveness: boolean;
}

export interface FaceVerifySubmitResponse {
  verifyRequestId: string;
  status: 'pending';
}

export type FaceVerifyResultStatus = 'pending' | 'pass' | 'fail';

export interface FaceVerifyResultDto {
  status: FaceVerifyResultStatus;
  faceVerified: boolean;
  livenessVerified: boolean;
  score: number | null;
  errorCode: string | null;
}
