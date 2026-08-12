import type { TenantDisplaySettings } from './types';

function validHex(value: string | null | undefined, fallback: string): string {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
}

function toDate(value: string | number | Date): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return value instanceof Date ? value : new Date(value);
}

export function formatTenantDate(
  value: string | number | Date,
  dateFormat = 'DD/MM/YYYY',
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = {
    DD: String(date.getDate()).padStart(2, '0'),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    YYYY: String(date.getFullYear()),
  };
  return dateFormat
    .replace(/YYYY/g, parts.YYYY)
    .replace(/DD/g, parts.DD)
    .replace(/MM/g, parts.MM);
}

export function formatTenantTime(
  value: string | number | Date,
  timeFormat = 'HH:mm',
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  const use12HourClock = /(^|\s)h(?::|\s)/.test(timeFormat);
  return date.toLocaleTimeString(use12HourClock ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: use12HourClock,
  });
}

export function resolveTenantColors(
  settings: TenantDisplaySettings,
  defaults: { primary: string; secondary: string; accent: string },
) {
  return {
    primary: validHex(settings.brandPrimaryColor, defaults.primary),
    secondary: validHex(settings.brandSecondaryColor, defaults.secondary),
    accent: validHex(settings.brandAccentColor, defaults.accent),
  };
}
