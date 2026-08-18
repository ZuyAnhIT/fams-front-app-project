export type RandomCheckMode =
  | 'location_only'
  | 'location_face'
  | 'location_face_liveness';

export type RandomCheckStatus =
  | 'pending'
  | 'sent'
  | 'responded'
  | 'expired'
  | 'cancelled';

export interface EmployeePendingCheck {
  id: string;
  tenantId: string;
  assignmentId: string;
  employeeId: string;
  siteId: string;
  shiftId: string;
  configId: string;
  configSnapshot: string;
  checkDate: string;
  checkIndex: number;
  scheduledAt: string;
  expiresAt: string | null;
  status: 'pending' | 'sent';
  secondsRemaining: number | null;
  createdAt: string;
}

export interface RandomCheckResponse {
  id: string;
  scheduledCheckId: string;
  employeeId: string;
  respondedAt: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  locationVerified: boolean;
  faceVerified: boolean | null;
  livenessVerified: boolean | null;
  faceVerifyScore: number | null;
  /** True only when the submitted selfie was accepted for secured evidence storage. */
  hasPhotoEvidence: boolean;
  outcome: 'pass' | 'fail';
  failureReason: string | null;
  createdAt: string;
}

/** Employee-safe result returned while/after asynchronous AI verification. */
export interface MyRandomCheckResult {
  checkId: string;
  status: RandomCheckStatus | 'no_response';
  processingStatus: 'pending' | 'completed';
  outcome: 'pass' | 'fail' | null;
  failureReason: string | null;
  locationVerified: boolean | null;
  faceVerified: boolean | null;
  livenessVerified: boolean | null;
  faceVerifyScore: number | null;
  respondedAt: string | null;
}

export interface SubmitRandomCheckPayload {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  employeePhotoBase64?: string;
  /** Required for location_face_liveness mode as of #104 (2026-08-18) — a passed, purpose=
   *  random_check active-liveness challengeId from POST .../face-id/liveness-challenge, started
   *  at this check's siteId. employeePhotoBase64 is no longer accepted for that mode. */
  livenessChallengeId?: string;
}

export interface RandomCheckSnapshot {
  checkMode: RandomCheckMode;
}
