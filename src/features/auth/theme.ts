import { palette } from '@/theme/tokens';
import { useTenantPreferences } from '@/features/tenant/tenant-preferences';

export const authColors = {
  light: {
    background: palette.canvas,
    card: palette.surface,
    text: palette.text,
    textSecondary: palette.textSecondary,
    textMuted: palette.textMuted,
    border: palette.border,
    borderLight: palette.surfaceMuted,
    primary: palette.primary,
    primaryDisabled: '#93B4F8',
    error: palette.danger,
    errorBg: palette.dangerSoft,
    errorBorder: '#FECACA',
    success: palette.success,
    inputBg: palette.canvas,
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: '#1E293B',
    primary: '#3B82F6',
    primaryDisabled: '#1E3A5F',
    error: '#F87171',
    errorBg: '#450A0A',
    errorBorder: '#7F1D1D',
    success: '#4ADE80',
    inputBg: '#0F172A',
    overlay: 'rgba(0,0,0,0.7)',
  },
} as const;

export type AuthTheme = (typeof authColors)[keyof typeof authColors];

export function useAuthTheme(): AuthTheme {
  // App chưa có công tắc dark mode và toàn bộ các màn khác (Home, Checkin,
  // Attendance, Assignment, Site...) đang hardcode màu theme sáng — nên bám
  // theo OS color scheme ở đây sẽ khiến riêng các màn dùng useAuthTheme()
  // (Profile, Auth, Face ID...) lật sang tối khi máy bật Dark Mode, lệch với
  // phần còn lại của app. Cố định light cho tới khi toàn app hỗ trợ dark mode.
  const { primaryColor } = useTenantPreferences();
  return {
    ...authColors.light,
    primary: primaryColor,
  } as AuthTheme;
}
