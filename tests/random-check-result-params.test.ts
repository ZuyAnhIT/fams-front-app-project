import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRandomCheckResultParams } from '../src/features/random-check/utils/random-check-result-params';

const valid = {
  checkId: 'check-1',
  mode: 'location_face',
  outcome: 'pass',
  locationVerified: 'true',
  faceVerified: 'true',
  livenessVerified: 'pending',
  score: '0.91',
  hasPhotoEvidence: 'true',
  processing: 'false',
};

test('parses a complete random-check result payload', () => {
  assert.deepEqual(parseRandomCheckResultParams(valid), {
    checkId: 'check-1',
    mode: 'location_face',
    outcome: 'pass',
    failureReason: null,
    locationVerified: true,
    faceVerified: true,
    livenessVerified: null,
    score: 0.91,
    hasPhotoEvidence: true,
    processing: false,
  });
});

test('does not fabricate a pass result from missing or invalid route params', () => {
  assert.equal(parseRandomCheckResultParams({}), null);
  assert.equal(parseRandomCheckResultParams({ ...valid, checkId: '' }), null);
  assert.equal(parseRandomCheckResultParams({ ...valid, outcome: 'unknown' }), null);
  assert.equal(parseRandomCheckResultParams({ ...valid, locationVerified: 'yes' }), null);
});

test('drops invalid similarity scores without invalidating an otherwise valid result', () => {
  assert.equal(parseRandomCheckResultParams({ ...valid, score: 'NaN' })?.score, null);
  assert.equal(parseRandomCheckResultParams({ ...valid, score: '1.5' })?.score, null);
});
