export type SiteStatus = 'active' | 'inactive';

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  status: SiteStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Polygon = list các cặp [longitude, latitude] (GeoJSON order), vòng khép kín. */
export interface Geofence {
  id: string;
  siteId: string;
  tenantId: string;
  coordinates: number[][];
  bufferMeters: number;
  status: 'active' | 'superseded';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** startTime/endTime serialize dạng chuỗi "HH:mm". */
export interface Shift {
  id: string;
  siteId: string;
  tenantId: string;
  name: string;
  startTime: string;
  endTime: string;
  allowOvernight: boolean;
  allowOvertime: boolean;
  earlyCheckinMinutes: number;
  lateCheckoutMinutes: number;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentRole = 'worker' | 'supervisor';
export type AssignmentStatus = 'active' | 'cancelled';

/**
 * Backend chỉ trả employeeId (UUID), KHÔNG có employeeName/fullName join sẵn.
 * Muốn hiển thị tên cần gọi thêm endpoint employee riêng — xem "Cần xác nhận thêm".
 */
export interface Assignment {
  id: string;
  tenantId: string;
  siteId: string;
  employeeId: string;
  shiftId: string | null;
  startDate: string;
  endDate: string | null;
  role: AssignmentRole;
  status: AssignmentStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Request Types ────────────────────────────────────────────────────────────

export interface SiteListParams {
  search?: string;
  status?: SiteStatus;
  sortBy?: 'name' | 'code' | 'status' | 'timezone' | 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface AssignmentListParams {
  status?: AssignmentStatus;
  role?: AssignmentRole;
  employeeId?: string;
  shiftId?: string;
  sortBy?: 'startDate' | 'endDate' | 'role' | 'status' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

// ─── Response Types ───────────────────────────────────────────────────────────

/** Chuẩn PageResponse của Spring Boot backend (com.fams.shared.pagination.PageResponse). */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type SiteListResponse = PageResponse<Site>;
export type AssignmentListResponse = PageResponse<Assignment>;

/**
 * Khớp com.fams.modules.site.dto.response.SiteDetailResponse:
 * gộp site + 1 geofence active (hoặc null) + list shift active + đếm assignment
 * active. KHÔNG gộp danh sách supervisor — phải gọi riêng
 * GET /tenants/{tenantId}/sites/{siteId}/assignments?role=supervisor&status=active.
 */
/** Trích từ EmployeeDetailResponse — chỉ lấy field cần cho hiển thị tên. */
export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface SiteDetailResponse {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  status: SiteStatus;
  createdBy: string;
  geofence: Geofence | null;
  shifts: Shift[];
  activeAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
}
