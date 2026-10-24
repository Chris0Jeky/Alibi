'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { webcrypto } = require('node:crypto');

// Fault injection for the Challenge section: a rejected write leaves the newest replay only in the
// mounted handle, and leaving Quiet Wing swallows the failed flush before disposing it. The
// transfer export must then refuse rather than report the older committed run as the whole device.
function fakeIndexedDb(records, faults) {
  const db = {
    objectStoreNames: { contains: (name) => name === 'runs' },
    close() {},
    transaction(name, mode) {
      assert.equal(name, 'runs');
      const tx = {},
        jobs = [],
        writes = [];
      const request = (compute) => {
        const r = {};
        jobs.push(() => {
          r.result = compute();
          r.onsuccess?.({ target: r });
        });
        return r;
      };
      queueMicrotask(async () => {
        jobs.forEach((job) => job());
        await null;
        if (mode === 'readwrite' && faults.failWrites) {
          tx.error = Object.assign(Error('injected quota failure'), { name: 'QuotaExceededError' });
          tx.onabort?.();
          return;
        }
        writes.forEach(([value, key]) => records.set(key, structuredClone(value)));
        tx.oncomplete?.();
      });
      tx.objectStore = () => ({
        get: (key) => request(() => structuredClone(records.get(key))),
        getAll: () => request(() => [...records.values()].map((v) => structuredClone(v))),
        getAllKeys: () => request(() => [...records.keys()]),
        put: (value, key) => writes.push([value, key]),
      });
      return tx;
    },
  };
  return {
    async databases() {
      return [{ name: 'alibi-challenges-v1' }];
    },
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
}

const run = (...log) => ({ challengeId: 'c1', log });
const registry = {
  validateRun(value) {
    if (!value || typeof value.challengeId !== 'string') throw Error('invalid run');
    return structuredClone(value);
  },
};

test('a failed Challenge write refuses the origin export until a write succeeds', async () => {
  const faults = { failWrites: false },
    records = new Map([['c1', { schema: 1, revision: 1, run: run('a') }]]);
  globalThis.indexedDB = fakeIndexedDb(records, faults);
  globalThis.crypto ??= webcrypto;
  try {
    require('../src/origin-transfer.js');
    const Store = require('../src/challenge-storage.js'),
      ports = globalThis.AlibiOriginTransfer.createDevicePorts({}),
      store = Store.create(registry);
    await store.open();
    assert.equal(store.info().mode, 'indexeddb');
    await store.read('c1');
    globalThis.QWApp = { challengeStore: store, disposed: true };

    // A refused restore keeps the committed run mounted and trustworthy: not an unsaved replay.
    faults.failWrites = true;
    await assert.rejects(store.restore(run('x')), /quota|storage/i);
    assert.equal((await ports.read('challenges')).runs[0].run.log.join(), 'a');

    // onSave rejects, then Activities.leave() -> disposeActive() swallows the failed flush.
    await assert.rejects(store.write(run('a', 'b')), /quota|storage/i);
    await store.flush().catch(() => {});
    await assert.rejects(ports.read('challenges'), /did not save/i);

    // The replay is still unsaved after a later read; only a committed write clears it.
    await store.read('c1');
    await assert.rejects(ports.read('challenges'), /did not save/i);
    faults.failWrites = false;
    await store.write(run('a', 'b'));
    const { runs } = await ports.read('challenges');
    assert.equal(runs[0].run.log.join(), 'a,b');
    assert.equal(runs[0].revision, 2);
  } finally {
    delete globalThis.QWApp;
    delete globalThis.indexedDB;
  }
});
