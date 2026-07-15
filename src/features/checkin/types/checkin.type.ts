import type { PageResponse } from '@/features/site/types/Site';

export type CheckinStatus = 'valid' | 'pending_review' | 'rejected';

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
}

// ─── submit checkin / checkout ─────────────────────────────────────────────────

export interface SubmitCheckinRequest {
  siteId: string;
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  deviceId?: string;
}

export interface SubmitCheckoutRequest {
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  deviceId?: string;
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
  workMinutes: number | null;
  gpsRiskScore: number;
  deviceId: string | null;
  createdAt: string;
  updatedAt: string;
  message: string;
  faceVerified: boolean | null;
  livenessVerified: boolean | null;
  faceVerifyScore: number | null;
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
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export type CheckinHistoryResponse = PageResponse<CheckinResponse>;
