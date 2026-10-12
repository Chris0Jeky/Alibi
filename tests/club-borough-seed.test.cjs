'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/backup-validation.js');
const E = require('../src/club-engines.js');

const validateSave = AlibiBackupValidation(C, null, () => E, 4).validateSave;

function validSave(runs) {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 0,
    lastHero: -1,
    runs,
    records: [],
    stamps: [],
  };
}

test('borough run without a seed is rejected', () => {
  assert.throws(
    () => validateSave(validSave({ borough: { log: [], redo: [] } })),
    /Invalid Borough seed/,
  );
});

test('borough run with null seed is rejected', () => {
  assert.throws(
    () => validateSave(validSave({ borough: { seed: null, log: [], redo: [] } })),
    /Invalid Borough seed/,
  );
});

test('borough run with empty seed is rejected', () => {
  assert.throws(
    () => validateSave(validSave({ borough: { seed: '', log: [], redo: [] } })),
    /Invalid Borough seed/,
  );
});

test('borough run with a valid seed and empty history validates', () => {
  assert.doesNotThrow(() =>
    validateSave(validSave({ borough: { seed: 'BOROUGH-1', log: [], redo: [] } })),
  );
});

test('borough numeric seeds remain valid without changing the saved seed', () => {
  for (const seed of [123, 0, -123]) {
    const save = validSave({ borough: { seed, log: [], redo: [] } });
    assert.deepEqual(validateSave(save), save);
    assert.equal(save.runs.borough.seed, seed);
  }
});

test('borough rejects non-finite numbers and non-seed values', () => {
  for (const seed of [NaN, Infinity, -Infinity, true, {}, [], 1.5, ' ', 'A'.repeat(33)]) {
    assert.throws(
      () => validateSave(validSave({ borough: { seed, log: [], redo: [] } })),
      /Invalid Borough seed|Use 1/,
    );
  }
});
