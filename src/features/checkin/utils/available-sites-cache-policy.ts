import type { AvailableSite } from '../types/checkin.type';

export const AVAILABLE_SITES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface AvailableSitesCache {
  cachedAt: number;
  sites: AvailableSite[];
}

function vietnamDate(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Available-sites is a "today" API. A cache may therefore only be reused on
 * the same Vietnam business date and for at most the backend's 24-hour offline
 * acceptance window. Absolute allowed-from/until instants remain authoritative.
 */
export function isAvailableSitesCacheUsable(
  cache: AvailableSitesCache,
  now = Date.now(),
): boolean {
  const age = now - cache.cachedAt;
  if (age < 0 || age > AVAILABLE_SITES_CACHE_TTL_MS || !Array.isArray(cache.sites)) {
    return false;
  }
  const reference = cache.sites.find((site) => Number.isFinite(Date.parse(site.serverNow)));
  if (!reference) return cache.sites.length === 0;

  const serverThen = Date.parse(reference.serverNow);
  return vietnamDate(serverThen) === vietnamDate(serverThen + age);
}
