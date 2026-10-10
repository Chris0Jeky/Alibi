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

test('invalid expected revisions are rejected before the stored run can change', async () => {
  const Store = loadStorage();
  for (const revision of [
    -1,
    0.5,
    Number.MIN_VALUE,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    false,
    null,
    '0',
  ]) {
    const store = new Store();
    const record = savedRun(0);
    store.memory.runs[record.key] = structuredClone(record);

    await assert.rejects(store.saveRun(record, revision), /Revision limit/i);
    assert.equal(store.memory.runs[record.key].rev, 0);
  }
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

function indexedRun(value, envelopeKey = 'precision-study@1') {
  let persisted = value === undefined ? undefined : { key: envelopeKey, value };
  const store = new (loadStorage())();
  store.db = {
    transaction() {
      const tx = {
        addEventListener() {},
        abort() {
          queueMicrotask(() => tx.onabort());
        },
        objectStore() {
          return {
            get() {
              const request = { result: structuredClone(persisted) };
              queueMicrotask(() => request.onsuccess());
              return request;
            },
            put(entry) {
              persisted = structuredClone(entry);
              queueMicrotask(() => tx.oncomplete());
            },
          };
        },
      };
      return tx;
    },
  };
  return { store, persisted: () => structuredClone(persisted) };
}

for (const [label, old] of [
  ['missing revision', { ...savedRun(0), rev: undefined }],
  ['future schema', { ...savedRun(0), schemaVersion: 9, future: { note: 'retain me' } }],
  ['mismatched key', { ...savedRun(0), key: 'another-study@1' }],
  ['null value', null],
  ['invalid revision', savedRun(-1)],
]) {
  test(`IndexedDB preserves an existing ${label} run on revision-zero save`, async () => {
    const fixture = indexedRun(old);
    const before = fixture.persisted();
    await assert.rejects(fixture.store.saveRun(savedRun(0), 0), { name: 'ConflictError' });
    assert.deepEqual(fixture.persisted(), before);
  });
}

test('IndexedDB distinguishes absence from an invalid envelope key and preserves normal CAS', async () => {
  const empty = indexedRun(undefined);
  assert.equal((await empty.store.saveRun(savedRun(0), 0)).rev, 1);
  assert.equal((await empty.store.saveRun(savedRun(1), 1)).rev, 2);
  await assert.rejects(empty.store.saveRun(savedRun(1), 1), { name: 'ConflictError' });
  assert.equal(empty.persisted().value.rev, 2);
  const wrongKey = indexedRun(savedRun(1), 'another-study@1');
  const before = wrongKey.persisted();
  await assert.rejects(wrongKey.store.saveRun(savedRun(1), 1), { name: 'ConflictError' });
  assert.deepEqual(wrongKey.persisted(), before);
});

test('an accepted revision-zero backup run can still advance through IndexedDB CAS', async () => {
  const record = cabinetValidator().validateRun(savedRun(0));
  const fixture = indexedRun(structuredClone(record));
  assert.equal((await fixture.store.saveRun(record, 0)).rev, 1);
  assert.equal(fixture.persisted().value.rev, 1);
  await assert.rejects(fixture.store.saveRun(record, 0), { name: 'ConflictError' });
});
