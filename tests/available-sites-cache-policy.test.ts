import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AVAILABLE_SITES_CACHE_TTL_MS,
  isAvailableSitesCacheUsable,
  type AvailableSitesCache,
} from '../src/features/checkin/utils/available-sites-cache-policy';
import type { AvailableSite } from '../src/features/checkin/types/checkin.type';

function cache(serverNow: string, cachedAt: number): AvailableSitesCache {
  return {
    cachedAt,
    sites: [{ serverNow } as AvailableSite],
  };
}

test('reuses same-day Vietnam schedule while device is offline', () => {
  const cachedAt = Date.parse('2026-09-05T01:00:00Z'); // 08:00 Vietnam
  assert.equal(
    isAvailableSitesCacheUsable(cache('2026-09-05T08:00:00+07:00', cachedAt), cachedAt + 60_000),
    true,
  );
});

test('rejects yesterday schedule after Vietnam midnight', () => {
  const cachedAt = Date.parse('2026-09-05T16:55:00Z'); // 23:55 Vietnam
  assert.equal(
    isAvailableSitesCacheUsable(cache('2026-09-05T23:55:00+07:00', cachedAt), cachedAt + 10 * 60_000),
    false,
  );
});

test('rejects cache older than backend offline acceptance window', () => {
  const cachedAt = Date.parse('2026-09-05T01:00:00Z');
  assert.equal(
    isAvailableSitesCacheUsable(
      cache('2026-09-05T08:00:00+07:00', cachedAt),
      cachedAt + AVAILABLE_SITES_CACHE_TTL_MS + 1,
    ),
    false,
  );
});
