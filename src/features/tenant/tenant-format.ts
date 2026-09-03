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
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  // Single pass over the format tokens (case-insensitive, longest-first). The old chained
  // `.replace()` calls could leave a token unreplaced when the configured pattern used a
  // different case (e.g. "dd/MM/yyyy") — that surfaced as a literal "03/09/YYYY" on the App
  // home screen (#18, 2026-09-03).
  return dateFormat.replace(/yyyy|yy|dd|mm/gi, (token) => {
    switch (token.toLowerCase()) {
      case 'yyyy':
        return yyyy;
      case 'yy':
        return yyyy.slice(-2);
      case 'dd':
        return dd;
      case 'mm':
        return mm;
      default:
        return token;
    }
  });
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
