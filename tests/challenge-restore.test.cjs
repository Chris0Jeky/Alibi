'use strict';
// fix-challenge-restore: an explicit restore replaces a protected challenge
// save while retaining the replaced bytes at recovery:+id. Registry harness
// from tests/challenge-library.test.cjs; fake IndexedDB follows the
// tests/challenge-storage-revision.test.cjs databaseWith pattern (raw
// records surfaced through request.result) extended to a keyed disk so the
// raw recovery:+id key is observable. No new dependencies.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const quiet = require('../src/quiet-wing/engine.js');
const club = require('../src/club-engines.js');
const catalogue = require('../tools/challenge-catalogue.cjs');
const registry = require('../src/challenges.js').create(catalogue.runtime(catalogue.load()), {
  quiet,
  club,
});
const ID = 'curated-classic-hanoi-01';

function loadStore(indexedDB) {
  const context = {
    clearTimeout,
    console,
    Date,
    indexedDB,
    JSON,
    Map,
    module: { exports: {} },
    setTimeout,
    structuredClone,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/challenge-storage.js'), 'utf8'), context);
  return context.module.exports;
}

// Minimal synchronous IndexedDB double: raw records keyed by id, staged puts
// applied on commit and discarded on abort.
function database(seeds = {}) {
  const disk = new Map(Object.entries(seeds));
  const db = {
    close() {},
    transaction() {
      const staged = [];
      const transaction = {
        error: null,
        aborted: false,
        abort() {
          this.aborted = true;
          this.onabort?.();
        },
        objectStore() {
          return {
            get(key) {
              const request = {};
              queueMicrotask(() => {
                if (transaction.aborted) return;
                request.result = disk.has(key) ? structuredClone(disk.get(key)) : undefined;
                request.onsuccess?.({ target: request });
                queueMicrotask(() => {
                  if (transaction.aborted) return;
                  for (const [k, v] of staged) disk.set(k, v);
                  transaction.oncomplete?.();
                });
              });
              return request;
            },
            put(value, key) {
              staged.push([key, structuredClone(value)]);
            },
          };
        },
      };
      return transaction;
    },
  };
  const indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
  return { indexedDB, disk };
}

function corruptRecord() {
  return { schema: 0, revision: 1, run: null };
}

async function openStore(seeds = {}) {
  const { indexedDB, disk } = database(seeds);
  const store = loadStore(indexedDB).create(registry);
  await store.open();
  assert.equal(store.info().mode, 'indexeddb');
  return { store, disk };
}

test('corrupt-read then explicit restore succeeds and reads back the run', async () => {
  const { store } = await openStore({ [ID]: corruptRecord() });
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  const run = registry.begin(ID);
  await store.restore(run);
  assert.deepEqual(await store.read(ID), run);
});

test('restore retains the replaced bytes under the raw recovery:+id key', async () => {
  const { store, disk } = await openStore({ [ID]: corruptRecord() });
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  await store.restore(registry.begin(ID));
  const retained = disk.get(`recovery:${ID}`);
  assert.ok(retained, 'restoring path writes a recovery key');
  assert.deepEqual(retained.record, corruptRecord());
  // The recovery() accessor re-validates the retained run, so it throws on
  // the corrupt bytes; the assertion above reads the raw key instead.
  await assert.rejects(store.recovery(ID));
});

test('non-restore writes to a protected id stay refused', async () => {
  const { store, disk } = await openStore({ [ID]: corruptRecord() });
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  await assert.rejects(store.write(registry.begin(ID)), /protected and was preserved/);
  assert.deepEqual(disk.get(ID), corruptRecord());
  assert.equal(disk.has(`recovery:${ID}`), false);
});

test('restore in session mode still requires transactional storage', async () => {
  const store = loadStore(undefined).create(registry);
  await store.open();
  assert.equal(store.info().mode, 'session');
  await assert.rejects(store.restore(registry.begin(ID)), /transactional/);
});

function validRecord() {
  return { schema: 1, revision: 1, run: registry.begin(ID) };
}

test('restore over a valid record with a stale revision still conflicts', async () => {
  const { store, disk } = await openStore({ [ID]: validRecord() });
  // No read first: the in-memory revision map is empty, so expected is 0
  // while the stored revision is 1 — a concurrent edit must not be silently
  // replaced even by an explicit restore.
  await assert.rejects(store.restore(registry.begin(ID)), /Another tab changed/);
  assert.deepEqual(disk.get(ID), validRecord());
  assert.equal(disk.has(`recovery:${ID}`), false);
});

test('restore after a fresh read replaces and retains recovery', async () => {
  const { store, disk } = await openStore({ [ID]: validRecord() });
  await store.read(ID);
  await store.restore(registry.begin(ID));
  assert.equal(disk.get(ID).revision, 2);
  assert.deepEqual(disk.get(`recovery:${ID}`).record, validRecord());
});
