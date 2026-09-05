import type { PageResponse } from '@/features/site/types/Site';

export type CheckinStatus = 'valid' | 'pending_review' | 'rejected';
export type CheckinPolicy = 'gps_only' | 'gps_face' | 'gps_face_liveness';
export type CheckinSource = 'online' | 'offline';
export type CheckinAvailabilityStatus =
  | 'unrestricted'
  | 'upcoming'
  | 'open'
  | 'closed';

// ─── available-sites ───────────────────────────────────────────────────────────

export interface CheckinSiteInfo {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

export interface CheckinShiftInfo {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  allowOvernight: boolean;
  earlyCheckinMinutes: number;
  lateCheckoutMinutes: number;
}

/** coordinates = list các cặp [longitude, latitude] (GeoJSON order). */
export interface CheckinGeofenceInfo {
  id: string;
  coordinates: number[][];
  bufferMeters: number;
}

export interface AvailableSite {
  assignmentId: string;
  assignmentRole: 'worker' | 'supervisor';
  site: CheckinSiteInfo;
  shift: CheckinShiftInfo | null;
  geofence: CheckinGeofenceInfo | null;
  /** Current time resolved by backend in this site's timezone. */
  serverNow: string;
  /** Concrete instants for this occurrence; null when no shift is linked. */
  checkinAllowedFrom: string | null;
  checkinAllowedUntil: string | null;
  /** UX hint only; submitCheckin remains the source of truth. */
  availabilityStatus: CheckinAvailabilityStatus;
  /** Policy đã resolve theo site + shift; App không tự suy luận từ site. */
  effectiveCheckinPolicy: CheckinPolicy;
}

// ─── submit checkin / checkout ─────────────────────────────────────────────────

export interface SubmitCheckinRequest {
  assignmentId: string;
  siteId: string;
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  deviceId?: string;
  employeePhotoBase64?: string;
  requiresLiveness?: boolean;
  livenessChallengeId?: string;
}

export interface SubmitCheckoutRequest {
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  deviceId?: string;
  employeePhotoBase64?: string;
  requiresLiveness?: boolean;
  livenessChallengeId?: string;
}

export interface CheckinResponse {
  id: string;
  tenantId: string;
  siteId: string;
  employeeId: string;
  assignmentId: string;
  shiftId: string | null;
  status: CheckinStatus;
  checkInAt: string;
  checkInLat: number;
  checkInLon: number;
  checkInAccuracy: number | null;
  checkInInsideGeofence: boolean;
  checkOutAt: string | null;
  sessionClosedAt: string | null;
  sessionCloseReason: 'checkout' | 'missing_checkout' | 'admin_closed' | null;
  sessionExpiresAt: string | null;
  shiftEndsAt: string | null;
  overtimeAllowed: boolean;
  sessionOpen: boolean;
  checkOutLat: number | null;
  checkOutLon: number | null;
  checkOutAccuracy: number | null;
  checkOutInsideGeofence: boolean | null;
  workMinutes: number | null;
  gpsRiskScore: number;
  deviceId: string | null;
  createdAt: string;
  updatedAt: string;
  message: string;
  faceVerified: boolean | null;
  livenessVerified: boolean | null;
  faceVerifyScore: number | null;
  checkoutFaceVerified: boolean | null;
  checkoutLivenessVerified: boolean | null;
  checkoutFaceVerifyScore: number | null;
  /** Snapshot tại check-in; null chỉ với bản ghi lịch sử trước V78. */
  effectiveCheckinPolicy: CheckinPolicy | null;
  source: CheckinSource;
  employeeName: string | null;
  employeeCode: string | null;
  siteName: string | null;
}

// ─── offline sync ─────────────────────────────────────────────────────────────

export interface OfflineCheckinRequest {
  assignmentId: string;
  checkinAt: string;
  lat: number;
  lon: number;
  accuracy?: number;
  facePhotoBase64?: string;
  clientNonce: string;
}

export type OfflineSyncStatus = 'accepted' | 'rejected' | 'conflict';

export interface OfflineSyncResultItem {
  clientNonce: string;
  status: OfflineSyncStatus;
  reason: string | null;
  checkinRecordId: string | null;
}

export type OfflineQueueStatus = 'pending' | 'rejected' | 'conflict' | 'expired';

export interface OfflineCheckinQueueItem {
  clientNonce: string;
  tenantId: string;
  userId: string;
  assignmentId: string;
  siteId: string;
  siteName: string;
  effectiveCheckinPolicy: CheckinPolicy;
  checkinAt: string;
  lat: number;
  lon: number;
  accuracy?: number;
  /** App-private file containing base64; never a gallery/public URI. */
  faceEvidenceFileUri?: string;
  status: OfflineQueueStatus;
  reason: string | null;
  attempts: number;
}

export interface OpenCheckinContext {
  checkinId: string;
  siteId: string | null;
  siteName: string | null;
  effectiveCheckinPolicy: CheckinPolicy | null;
  checkInAt?: string | null;
  sessionExpiresAt?: string | null;
  shiftEndsAt?: string | null;
  overtimeAllowed?: boolean;
}

// ─── explain ────────────────────────────────────────────────────────────────────

export interface SubmitExplanationRequest {
  note: string;
  /** Cần xác nhận thêm: cách upload ảnh giải trình (multipart riêng hay URL đã upload sẵn). */
  photoUrl?: string;
}

export interface ExplanationResponse {
  id: string;
  employeeNote: string;
  employeePhotoUrl: string | null;
  updatedAt: string;
}

// ─── history / list ─────────────────────────────────────────────────────────────

export interface CheckinHistoryParams {
  siteId?: string;
  status?: CheckinStatus;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export type CheckinHistoryResponse = PageResponse<CheckinResponse>;
