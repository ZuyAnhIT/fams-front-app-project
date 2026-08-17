import { palette } from '@/theme/tokens';

import type { MyAssignmentRole, MyAssignmentStatus } from '../types/my-assignment.type';

export const ASSIGNMENT_STATUS_LABELS: Record<MyAssignmentStatus, string> = {
  active: 'Đang hiệu lực',
  cancelled: 'Đã hủy',
};

export const ASSIGNMENT_STATUS_COLORS: Record<MyAssignmentStatus, string> = {
  active: palette.success,
  cancelled: palette.textMuted,
};

export const ASSIGNMENT_STATUS_BACKGROUNDS: Record<MyAssignmentStatus, string> = {
  active: palette.successSoft,
  cancelled: palette.surfaceMuted,
};

export const ASSIGNMENT_ROLE_LABELS: Record<MyAssignmentRole, string> = {
  worker: 'Nhân viên',
  supervisor: 'Giám sát',
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'T2',
  TUESDAY: 'T3',
  WEDNESDAY: 'T4',
  THURSDAY: 'T5',
  FRIDAY: 'T6',
  SATURDAY: 'T7',
  SUNDAY: 'CN',
};

export function formatDaysOfWeek(days: string[] | null): string {
  if (!days || days.length === 0) return 'Mọi ngày trong tuần';
  return days.map((day) => DAY_LABELS[day] ?? day).join(', ');
}
