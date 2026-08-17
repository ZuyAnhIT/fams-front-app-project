/**
 * Khớp AssignmentResponse.java trả về từ GET /tenants/{tenantId}/assignments/me — endpoint
 * cross-site "phân công của tôi" (khác với GET /sites/{siteId}/assignments dùng cho màn quản lý
 * theo từng site, xem src/features/assignment/). Không phân trang (lịch sử phân công 1 nhân viên
 * đủ nhỏ để không cần).
 */
export type MyAssignmentRole = 'worker' | 'supervisor';
export type MyAssignmentStatus = 'active' | 'cancelled';

export interface MyAssignmentSiteSummary {
  id: string;
  name: string;
}

export interface MyAssignmentShiftSummary {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'inactive';
}

export interface MyAssignment {
  id: string;
  tenantId: string;
  siteId: string;
  employeeId: string;
  shiftId: string | null;
  siteSummary: MyAssignmentSiteSummary | null;
  shiftSummary: MyAssignmentShiftSummary | null;
  startDate: string; // yyyy-MM-dd
  endDate: string | null; // yyyy-MM-dd
  daysOfWeek: string[] | null;
  role: MyAssignmentRole;
  status: MyAssignmentStatus;
  cancelledBy: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
