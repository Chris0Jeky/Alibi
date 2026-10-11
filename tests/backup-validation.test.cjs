'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadValidation() {
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'backup-validation.js'), 'utf8'),
    context,
  );
  return context.AlibiBackupValidation;
}

const AlibiBackupValidation = loadValidation();
const C = { clone: (x) => JSON.parse(JSON.stringify(x)) };
const E = () => ({ reversi: { strength() {} } });

function clubSave(overrides = {}) {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 0,
    lastHero: -1,
    runs: {},
    records: [],
    stamps: [],
    ...overrides,
  };
}

function validateSave(v) {
  return AlibiBackupValidation(C, null, E, 4).validateSave(v);
}

test('club record with an unparseable date is rejected', () => {
  const v = clubSave({
    records: [{ id: 'x', type: 'duel', label: 'y', score: 1, date: 'yesterday' }],
  });
  assert.throws(() => validateSave(v), /Invalid record\./);
});

test('club record with a parseable date is accepted', () => {
  const v = clubSave({
    records: [
      { id: 'x', type: 'duel', label: 'y', score: 1, date: '2026-09-27T00:00:00.000Z' },
    ],
  });
  assert.deepEqual(validateSave(v).records, v.records);
});
