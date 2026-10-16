'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const E = require('../src/quiet-wing/engine.js');

function installLocalStorageStub(initial = {}) {
  const m = new Map(Object.entries(initial));
  const storage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      m.set(k, String(v));
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
  return storage;
}

function loadStore(storage) {
  const code = fs.readFileSync(path.join(__dirname, '../src/quiet-wing/storage.js'), 'utf8');
  const ctx = {
    console,
    Promise,
    Date,
    Error,
    JSON,
    Map,
    structuredClone,
    setTimeout: (f, ms) => setTimeout(f, ms === 2200 ? 40 : ms),
    clearTimeout,
    QWEngine: E,
    localStorage: storage,
    indexedDB: undefined,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.QWStore;
}

test('corrupt fallback is quarantined and writes resume', async () => {
  const storage = installLocalStorageStub({
    'alibi-quiet-wing-v1:fallback': '{',
  });
  const QWStore = loadStore(storage);
  const report = await QWStore.open();
  assert.equal(report.blocked, false);
  assert.equal(report.saved, null);
  const next = E.newState(1700000000000);
  next.scene.name = 'kept';
  await QWStore.write(next);
  assert.equal(storage.getItem('alibi-quiet-wing-v1:fallback:recovery'), '{');
  const snapshot = JSON.parse(storage.getItem('alibi-quiet-wing-v1:fallback'));
  assert.equal(snapshot.scene.name, 'kept');
  assert.equal(snapshot.revision, 1);
  assert.equal(report.blocked, false);
  assert.equal(QWStore.info().blocked, false);
});

test('failed quarantine preserves the corrupt fallback and blocks writes', async () => {
  const storage = installLocalStorageStub({
    'alibi-quiet-wing-v1:fallback': '{',
  });
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (key.endsWith(':recovery')) throw Error('quota');
    setItem(key, value);
  };
  const store = loadStore(storage);
  assert.equal((await store.open()).blocked, true);
  assert.equal(storage.getItem('alibi-quiet-wing-v1:fallback'), '{');
  assert.equal(storage.getItem('alibi-quiet-wing-v1:fallback:recovery'), null);
  await assert.rejects(store.write(E.newState(1700000000000)), /read-only/);
});

test('occupied recovery preserves both records and blocks writes', async () => {
  const recovery = JSON.stringify(E.newState(1700000000000));
  const storage = installLocalStorageStub({
    'alibi-quiet-wing-v1:fallback': '{',
    'alibi-quiet-wing-v1:fallback:recovery': recovery,
  });
  const store = loadStore(storage);
  assert.equal((await store.open()).blocked, true);
  assert.equal(storage.getItem('alibi-quiet-wing-v1:fallback'), '{');
  assert.equal(storage.getItem('alibi-quiet-wing-v1:fallback:recovery'), recovery);
  await assert.rejects(store.write(E.newState(1700000000000)), /read-only/);
  const exported = await store.raw();
  assert.equal(exported.fallback, '{');
  assert.equal(exported.recovery, recovery);
});
