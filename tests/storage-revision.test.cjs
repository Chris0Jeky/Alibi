'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadStorage() {
  const context = {
    AlibiCore: { clone: structuredClone },
    clearTimeout,
    console,
    dispatchEvent() {},
    Event: class Event {},
    setTimeout,
    structuredClone,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8'), context);
  return context.AlibiStorage.Store;
}

function cabinetValidator() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../src/backup-validation.js'), 'utf8'),
    context,
  );
  const core = {
    TYPES: [],
    clone: structuredClone,
    validateDefinition: (value) => value,
    validateState() {},
  };
  return context.AlibiBackupValidation(core, { puzzles: [] }, () => ({}), 4);
}

function savedRun(rev) {
  return {
    schemaVersion: 1,
    key: 'precision-study@1',
    rev,
    puzzle: { id: 'precision-study', revision: 1 },
    state: {},
    moves: 0,
    hints: 0,
    elapsed: 0,
    note: '',
    undo: [],
    redo: [],
    updatedAt: '2026-09-16T00:00:00.000Z',
  };
}

test('an unsafe persisted cabinet revision is rejected without normalization', () => {
  const validator = cabinetValidator();
  assert.throws(
    () => validator.validateRun(savedRun(Number.MAX_SAFE_INTEGER + 1)),
    /Unsupported saved-game format/,
  );
});

test('the final safe cabinet revision stays readable but cannot overflow on save', async () => {
  const validator = cabinetValidator();
  const record = savedRun(Number.MAX_SAFE_INTEGER);
  assert.equal(validator.validateRun(structuredClone(record)).rev, Number.MAX_SAFE_INTEGER);

  const Store = loadStorage();
  const store = new Store();
  store.memory.runs[record.key] = structuredClone(record);

  await assert.rejects(
    store.saveRun(record, Number.MAX_SAFE_INTEGER),
    /revision limit|safe integer/i,
  );
  assert.equal(store.memory.runs[record.key].rev, Number.MAX_SAFE_INTEGER);
});

test('the penultimate cabinet revision can advance exactly to the safe limit', async () => {
  const Store = loadStorage();
  const store = new Store();
  const record = savedRun(Number.MAX_SAFE_INTEGER - 1);
  store.memory.runs[record.key] = structuredClone(record);

  const saved = await store.saveRun(record, Number.MAX_SAFE_INTEGER - 1);
  assert.equal(saved.rev, Number.MAX_SAFE_INTEGER);
  assert.equal(store.memory.runs[record.key].rev, Number.MAX_SAFE_INTEGER);
});
