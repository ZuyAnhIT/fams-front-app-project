import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isOfflineEvidenceExpired,
  OFFLINE_EVIDENCE_TTL_MS,
} from '../src/features/checkin/utils/offline-checkin-policy';

test('keeps evidence through the 24-hour boundary', () => {
  const now = Date.parse('2026-08-08T12:00:00Z');
  assert.equal(
    isOfflineEvidenceExpired(new Date(now - OFFLINE_EVIDENCE_TTL_MS).toISOString(), now),
    false,
  );
});

test('expires evidence older than 24 hours', () => {
  const now = Date.parse('2026-08-08T12:00:00Z');
  assert.equal(
    isOfflineEvidenceExpired(new Date(now - OFFLINE_EVIDENCE_TTL_MS - 1).toISOString(), now),
    true,
  );
});

test('does not silently expire malformed legacy timestamps', () => {
  assert.equal(isOfflineEvidenceExpired('not-a-date'), false);
});
