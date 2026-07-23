import { Platform } from 'react-native';

/** Shared visual language for every production screen. */
export const palette = {
  canvas: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceBrand: '#EFF6FF',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#DBEAFE',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  darkAction: '#0F172A',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const layout = {
  contentMaxWidth: 720,
  wideContentMaxWidth: 960,
  horizontalPadding: 20,
  minTouchTarget: 44,
} as const;

export const shadows = {
  brand: Platform.select({
    ios: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
    default: {
      boxShadow: '0 6px 20px rgba(37, 99, 235, 0.3)',
    },
  }),
  card: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {
      boxShadow: '0 3px 16px rgba(15, 23, 42, 0.07)',
    },
  }),
  subtle: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 1 },
    default: {
      boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)',
    },
  }),
  toast: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: { elevation: 8 },
    default: {
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
    },
  }),
} as const;
