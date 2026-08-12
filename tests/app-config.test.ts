import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loadedConfig = require('../app.config.ts');
const configure = (loadedConfig.default ?? loadedConfig) as (input: {
  config: Record<string, any>;
}) => any;
const base = require('../app.json').expo;

test('does not advertise universal links without an HTTPS app origin', () => {
  const previous = process.env.EXPO_PUBLIC_APP_URL;
  delete process.env.EXPO_PUBLIC_APP_URL;
  try {
    const config = configure({ config: base });
    assert.equal(config.ios.associatedDomains, undefined);
    assert.equal(config.android.intentFilters, undefined);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
    else process.env.EXPO_PUBLIC_APP_URL = previous;
  }
});

test('generates only the three supported email-link routes', () => {
  const previous = process.env.EXPO_PUBLIC_APP_URL;
  process.env.EXPO_PUBLIC_APP_URL = 'https://app.fams.vn';
  try {
    const config = configure({ config: base });
    assert.deepEqual(config.ios.associatedDomains, ['applinks:app.fams.vn']);
    assert.deepEqual(
      config.android.intentFilters[0].data.map((item: { pathPrefix: string }) => item.pathPrefix),
      ['/reset-password', '/verify-email', '/accept-invite'],
    );
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
    else process.env.EXPO_PUBLIC_APP_URL = previous;
  }
});

test('rejects insecure or path-scoped production app origins', () => {
  const previous = process.env.EXPO_PUBLIC_APP_URL;
  try {
    for (const value of ['http://app.fams.vn', 'https://app.fams.vn/path']) {
      process.env.EXPO_PUBLIC_APP_URL = value;
      assert.throws(() => configure({ config: base }), /HTTPS.*origin|use HTTPS/);
    }
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
    else process.env.EXPO_PUBLIC_APP_URL = previous;
  }
});
