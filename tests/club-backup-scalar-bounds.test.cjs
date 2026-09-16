'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

require('../src/core.js');
const C = require('../src/engines.js');
require('../src/bridges.js');
const E = require('../src/club-engines.js');
require('../src/backup-validation.js');

const root = path.resolve(__dirname, '..');
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

async function clubTab(localStorage) {
  const context = {
    clearTimeout,
    console,
    Date,
    document: {
      addEventListener() {},
      createElement() {
        return {};
      },
      body: { append() {} },
    },
    JSON,
    localStorage,
    location: { hash: '' },
    Math,
    Number,
    Promise,
    setTimeout,
    URL,
    URLSearchParams,
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const file of ['core', 'backup-validation', 'club-engines', 'club'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src', file + '.js'), 'utf8'), context);
  await context.AlibiClub.init({ render() {}, settings: () => ({}), toast() {} });
  return context;
}

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

test('booting a terminal visit counter keeps the exported save re-importable', async () => {
  const data = new Map();
  const localStorage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
  localStorage.setItem(
    'alibi-afterhours-v1',
    JSON.stringify({ rev: 1, data: withValue('visit', Number.MAX_SAFE_INTEGER) }),
  );

  const context = await clubTab(localStorage);
  const saved = JSON.parse(localStorage.getItem('alibi-afterhours-v1'));

  assert.equal(context.AlibiClub.diagnostics().state.visit, Number.MAX_SAFE_INTEGER);
  assert.equal(saved.data.visit, Number.MAX_SAFE_INTEGER);
  assert.doesNotThrow(() => validator.validateSave(saved.data));
});
