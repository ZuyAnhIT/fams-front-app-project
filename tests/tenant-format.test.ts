import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatTenantDate,
  formatTenantTime,
  resolveTenantColors,
} from '../src/features/tenant/tenant-format';

test('formats date-only values without a UTC day shift', () => {
  assert.equal(formatTenantDate('2026-08-07', 'DD/MM/YYYY'), '07/08/2026');
  assert.equal(formatTenantDate('2026-08-07', 'MM/DD/YYYY'), '08/07/2026');
  assert.equal(formatTenantDate('2026-08-07', 'YYYY-MM-DD'), '2026-08-07');
});

test('honours 24-hour and 12-hour tenant time formats', () => {
  const value = new Date(2026, 7, 7, 15, 5, 0);
  assert.match(formatTenantTime(value, 'HH:mm'), /^15:05$/);
  assert.match(formatTenantTime(value, 'h:mm a'), /^03:05 PM$/);
});

test('rejects invalid tenant brand colors', () => {
  const colors = resolveTenantColors(
    {
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
      brandPrimaryColor: 'red',
      brandSecondaryColor: '#10B981',
    },
    { primary: '#2563EB', secondary: '#15803D', accent: '#B45309' },
  );
  assert.deepEqual(colors, {
    primary: '#2563EB',
    secondary: '#10B981',
    accent: '#B45309',
  });
});
