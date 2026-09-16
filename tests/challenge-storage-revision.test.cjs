'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadStore(indexedDB) {
  const context = {
    clearTimeout,
    console,
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

function registry() {
  return {
    validateRun(run) {
      if (!run || typeof run.challengeId !== 'string') throw Error('invalid run');
      return structuredClone(run);
    },
  };
}

function databaseWith(record) {
  const writes = [];
  let current = structuredClone(record);
  const db = {
    close() {},
    transaction(_name, mode) {
      const transaction = {
        error: null,
        abort() {
          this.onabort?.();
        },
        objectStore() {
          return {
            get() {
              const request = {};
              queueMicrotask(() => {
                request.result = structuredClone(current);
                request.onsuccess?.({ target: request });
                queueMicrotask(() => transaction.oncomplete?.());
              });
              return request;
            },
            put(value, key) {
              writes.push({ value: structuredClone(value), key, mode });
              current = structuredClone(value);
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
  return { indexedDB, writes };
}

test('an unsafe persisted challenge revision is preserved rather than accepted', async () => {
  const run = { challengeId: 'unsafe-revision' };
  const fixture = databaseWith({
    schema: 1,
    revision: Number.MAX_SAFE_INTEGER + 1,
    run,
  });
  const store = loadStore(fixture.indexedDB).create(registry());
  await store.open();

  await assert.rejects(store.read(run.challengeId), /unsupported.*preserved/i);
  await assert.rejects(store.write(run), /protected/i);
  assert.equal(fixture.writes.length, 0);
});

test('the final safe revision remains readable but cannot overflow on the next write', async () => {
  const run = { challengeId: 'exhausted-revision' };
  const fixture = databaseWith({
    schema: 1,
    revision: Number.MAX_SAFE_INTEGER,
    run,
  });
  const store = loadStore(fixture.indexedDB).create(registry());
  await store.open();

  assert.deepEqual(await store.read(run.challengeId), run);
  await assert.rejects(store.write(run), /revision.*limit|protected/i);
  assert.equal(fixture.writes.length, 0, 'no imprecise revision is committed');
});
