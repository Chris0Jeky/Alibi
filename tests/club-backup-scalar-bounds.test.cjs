'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../src/core.js');
const C = require('../src/engines.js');
require('../src/bridges.js');
const E = require('../src/club-engines.js');
require('../src/backup-validation.js');

const STORY_COUNT = 4;
const validator = globalThis.AlibiBackupValidation(C, null, () => E, STORY_COUNT);
const valid = {
  schema: 1,
  settings: { assist: 'off', zen: false, pinned: null },
  visit: 0,
  lastHero: -1,
  runs: {},
  records: [],
  stamps: [],
};

const withValue = (field, value) => ({ ...valid, [field]: value });

test('Club backup accepts only the initial or a real story index as lastHero', () => {
  assert.doesNotThrow(() => validator.validateSave(valid));
  assert.doesNotThrow(() => validator.validateSave(withValue('lastHero', 0)));
  assert.doesNotThrow(() => validator.validateSave(withValue('lastHero', STORY_COUNT - 1)));

  for (const value of [-2, STORY_COUNT, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => validator.validateSave(withValue('lastHero', value)),
      /Invalid Club preferences/,
      `lastHero ${value} must be rejected`,
    );
  }
});

test('Club backup visit counter is a non-negative safe integer', () => {
  assert.doesNotThrow(() => validator.validateSave(withValue('visit', Number.MAX_SAFE_INTEGER)));

  for (const value of [-1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => validator.validateSave(withValue('visit', value)),
      /Invalid Club preferences/,
      `visit ${value} must be rejected`,
    );
  }
});
