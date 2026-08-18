export interface EmployeeTodayShift {
  assignmentId: string;
  siteId: string;
  siteName: string;
  role: string;
  shift: { shiftId: string; name: string; startTime: string; endTime: string } | null;
}

export interface EmployeeDashboard {
  todayShifts: EmployeeTodayShift[];
  checkin: {
    checkinId: string;
    siteId: string;
    status: 'valid' | 'pending_review' | 'rejected';
    checkInAt: string;
    checkOutAt: string | null;
    workMinutes: number | null;
    open: boolean;
  } | null;
  monthlyAttendance: {
    month: string;
    presentDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    missingCheckoutDays: number;
    totalOtMinutes: number;
    totalWorkMinutes: number;
  };
  alerts: { unreadNotifications: number; pendingExplanations: number };
}

export interface SupervisedSiteStatus {
    siteId: string;
    siteName: string;
    expectedToday: number;
    onSiteNow: number;
    randomCheckPending: number;
    unresolvedViolations: number;
    onSiteEmployees: {
      employeeId: string;
      firstName: string;
      lastName: string;
      employeeCode: string | null;
      checkinId: string;
      checkInAt: string;
    }[];
}

export interface SupervisorDashboard {
  supervisedSites: SupervisedSiteStatus[];
}
