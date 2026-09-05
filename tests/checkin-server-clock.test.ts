import assert from 'node:assert/strict';
import test from 'node:test';

import type { AvailableSite } from '../src/features/checkin/types/checkin.type';
import {
  getEffectiveAvailabilityStatus,
  getEstimatedServerNow,
} from '../src/features/checkin/utils/available-site';

const site: AvailableSite = {
  assignmentId: 'assignment-2',
  assignmentRole: 'worker',
  site: {
    id: 'site-1',
    name: 'Công trình',
    code: null,
    address: null,
    latitude: null,
    longitude: null,
    timezone: 'Asia/Ho_Chi_Minh',
  },
  shift: null,
  geofence: null,
  serverNow: '2026-09-04T21:40:00+07:00',
  checkinAllowedFrom: '2026-09-04T21:35:00+07:00',
  checkinAllowedUntil: '2026-09-04T21:55:00+07:00',
  availabilityStatus: 'open',
  effectiveCheckinPolicy: 'gps_only',
};

test('advances the backend clock by elapsed time instead of trusting device wall time', () => {
  const deviceClockAtFetch = Date.parse('2035-01-01T00:00:00Z');
  const twoMinutesLaterOnSameDevice = deviceClockAtFetch + 2 * 60_000;

  assert.equal(
    getEstimatedServerNow(site, twoMinutesLaterOnSameDevice, deviceClockAtFetch),
    Date.parse('2026-09-04T21:42:00+07:00'),
  );
  assert.equal(
    getEffectiveAvailabilityStatus(site, twoMinutesLaterOnSameDevice, deviceClockAtFetch),
    'open',
  );
});
