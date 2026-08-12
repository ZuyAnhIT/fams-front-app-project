import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { palette } from '@/theme/tokens';

import { useTenantSettings } from './hooks/use-tenant-settings';
import type { TenantDisplaySettings } from './types';
import {
  formatTenantDate,
  formatTenantTime,
  resolveTenantColors,
} from './tenant-format';

const DEFAULT_SETTINGS: TenantDisplaySettings = {
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'HH:mm',
  brandPrimaryColor: palette.primary,
  brandSecondaryColor: palette.success,
  brandAccentColor: palette.warning,
};

export interface TenantPreferences {
  settings: TenantDisplaySettings;
  isLoading: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  formatDate: (value: string | number | Date) => string;
  formatTime: (value: string | number | Date) => string;
  formatDateTime: (value: string | number | Date) => string;
}

const TenantPreferencesContext = createContext<TenantPreferences | null>(null);

export function TenantPreferencesProvider({ children }: { children: ReactNode }) {
  const tenantId = useAuthStore((state) => state.activeTenantId ?? undefined);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const query = useTenantSettings(authenticated ? tenantId : undefined);
  const settings = query.settings ?? DEFAULT_SETTINGS;

  const value = useMemo<TenantPreferences>(() => {
    const formatDate = (input: string | number | Date) =>
      formatTenantDate(input, settings.dateFormat || DEFAULT_SETTINGS.dateFormat);
    const formatTime = (input: string | number | Date) =>
      formatTenantTime(input, settings.timeFormat || DEFAULT_SETTINGS.timeFormat);
    const colors = resolveTenantColors(settings, {
      primary: palette.primary,
      secondary: palette.success,
      accent: palette.warning,
    });
    return {
      settings,
      isLoading: query.isLoading,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
      formatDate,
      formatTime,
      formatDateTime: (input) => `${formatDate(input)} ${formatTime(input)}`,
    };
  }, [query.isLoading, settings]);

  return (
    <TenantPreferencesContext.Provider value={value}>
      {children}
    </TenantPreferencesContext.Provider>
  );
}

export function useTenantPreferences(): TenantPreferences {
  const value = useContext(TenantPreferencesContext);
  if (!value) {
    throw new Error('useTenantPreferences phải được dùng trong TenantPreferencesProvider.');
  }
  return value;
}
