import assert from 'node:assert/strict';
import test from 'node:test';
import { AxiosError } from 'axios';

import { mapTotpSetupResponse } from '../src/features/auth/api-mappers';
import { isTotpAlreadyEnabledError } from '../src/features/auth/utils';

test('maps the current TOTP setup contract and keeps deprecated URL optional', () => {
  const result = mapTotpSetupResponse({
    setupToken: '550e8400-e29b-41d4-a716-446655440000',
    otpauthUri:
      'otpauth://totp/FAMS:user%2Bdemo%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=FAMS&algorithm=SHA1&digits=6&period=30',
    manualEntryKey: 'JBSWY3DPEHPK3PXP',
    expiresAt: '2026-08-12T21:30:00+07:00',
  });

  assert.equal(result.setup_token, '550e8400-e29b-41d4-a716-446655440000');
  assert.match(result.otpauth_uri, /^otpauth:\/\/totp\/FAMS:/);
  assert.equal(result.secret, 'JBSWY3DPEHPK3PXP');
  assert.equal(result.expires_at, '2026-08-12T21:30:00+07:00');
  assert.equal(result.qr_code_url, undefined);
});

test('fails closed when a security-sensitive TOTP setup field is missing', () => {
  assert.throws(
    () =>
      mapTotpSetupResponse({
        setupToken: 'setup-token',
        manualEntryKey: 'SECRET',
        expiresAt: '2026-08-12T21:30:00+07:00',
      }),
    /không đầy đủ/,
  );
});

test('recognises the dedicated 409 already-enabled response without masking other conflicts', () => {
  const alreadyEnabled = new AxiosError(
    'Conflict',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} } as never,
      data: {
        errorCode: 'TOTP_ALREADY_ENABLED',
        userMessage: 'Tài khoản đã bật 2FA.',
      },
    },
  );
  const emailConflict = new AxiosError(
    'Conflict',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} } as never,
      data: { errorCode: 'EMAIL_ALREADY_EXISTS' },
    },
  );

  assert.equal(isTotpAlreadyEnabledError(alreadyEnabled), true);
  assert.equal(isTotpAlreadyEnabledError(emailConflict), false);
});
