export interface AttendanceSummary {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  shiftId: string | null;
  assignmentId: string | null;
  attendanceDate: string;
  firstCheckinAt: string | null;
  lastCheckoutAt: string | null;
  totalWorkMinutes: number;
  sessionCount: number;
  status: 'present' | 'incomplete';
  late: boolean;
  lateMinutes: number;
  earlyLeave: boolean;
  earlyLeaveMinutes: number;
  otMinutes: number;
  missingCheckout: boolean;
  hasPendingReviewSession: boolean;
  hasRejectedSession: boolean;
  /** Warning only; it does not subtract work or overtime minutes. */
  hasRandomCheckFailure: boolean;
  createdAt: string;
  updatedAt: string;
  adjustmentReason: string | null;
}

export interface AttendanceMonthly {
  tenantId: string;
  employeeId: string;
  year: number;
  month: number;
  presentDays: number;
  /** Includes totalOtMinutes; OT must never be added to this number again. */
  totalWorkMinutes: number;
  lateDays: number;
  totalLateMinutes: number;
  earlyLeaveDays: number;
  totalEarlyLeaveMinutes: number;
  totalOtMinutes: number;
  missingCheckoutDays: number;
  daysWithPendingReview: number;
  daysWithRejectedSession: number;
  /** Warning only; it does not subtract work or overtime minutes. */
  daysWithRandomCheckFailure: number;
  dailySummaries: AttendanceSummary[];
}
