import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AvailableSite } from '../types/checkin.type';
import {
  isAvailableSitesCacheUsable,
  type AvailableSitesCache,
} from '../utils/available-sites-cache-policy';

const CACHE_PREFIX = '@fams_available_checkin_sites:v1';

function cacheKey(userId: string, tenantId: string): string {
  return `${CACHE_PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(tenantId)}`;
}

export async function writeAvailableSitesCache(
  userId: string,
  tenantId: string,
  sites: AvailableSite[],
  cachedAt = Date.now(),
): Promise<AvailableSitesCache> {
  const cache = { cachedAt, sites };
  await AsyncStorage.setItem(cacheKey(userId, tenantId), JSON.stringify(cache));
  return cache;
}

export type { AvailableSitesCache } from '../utils/available-sites-cache-policy';

export async function readAvailableSitesCache(
  userId: string,
  tenantId: string,
  now = Date.now(),
): Promise<AvailableSitesCache | null> {
  const stored = await AsyncStorage.getItem(cacheKey(userId, tenantId));
  if (!stored) return null;
  try {
    const cache = JSON.parse(stored) as AvailableSitesCache;
    if (isAvailableSitesCacheUsable(cache, now)) return cache;
  } catch {
    // Invalid local cache is treated as a cache miss.
  }
  await AsyncStorage.removeItem(cacheKey(userId, tenantId));
  return null;
}
