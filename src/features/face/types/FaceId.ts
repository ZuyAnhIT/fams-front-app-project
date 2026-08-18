export type FaceIdStatus = 'not_enrolled' | 'enrolled' | 'revoked';
export type FaceIdReviewStatus = 'none' | 'pending' | 'rejected';

export interface FaceIdStatusDto {
  status: FaceIdStatus;
  consentGiven: boolean;
  consentGivenAt: string | null;
  enrolledAt: string | null;
  revokedAt: string | null;
  reviewStatus: FaceIdReviewStatus;
  pendingPhotoCount: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  /** Optional forward-compatible fields recommended for an embedding-model migration. */
  embeddingModel?: 'dlib_128' | 'arcface_512' | null;
  requiresReEnrollment?: boolean;
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

// ─── Active liveness ─────────────────────────────────────────────────────────

export type FaceLivenessPurpose = 'enroll' | 'checkin' | 'checkout' | 'random_check';
export type FaceLivenessAction =
  | 'center'
  | 'turn_left'
  | 'turn_right'
  | 'look_up'
  | 'look_down'
  | 'blink';

export interface FaceLivenessChallengeDto {
  challengeId: string;
  actions: FaceLivenessAction[];
  expiresAt: string;
}

export interface FaceLivenessStepResult {
  action: FaceLivenessAction | 'anti_spoof_check';
  passed: boolean;
  reason?: string;
  detected?: string[];
  score?: number;
}

export interface FaceLivenessResultDto {
  status: 'passed' | 'failed';
  reason: string | null;
  steps: FaceLivenessStepResult[];
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
