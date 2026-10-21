'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

require('../src/origin-transfer.js');

const api = globalThis.AlibiOriginTransfer;
const databaseName = 'alibi-quiet-wing-v1';
const fallbackKey = databaseName + ':fallback';
const originalState = { schema: 1, revision: 1, scene: { room: 'original' } };

function fixture({ fallback = originalState, fail = null } = {}) {
  const records = new Map([['state', structuredClone(originalState)]]);
  const values = new Map();
  if (fallback !== null) values.set(fallbackKey, JSON.stringify(fallback));

  const db = {
    objectStoreNames: { contains: (name) => name === 'saves' },
    close() {},
    transaction(storeName, mode) {
      assert.equal(storeName, 'saves');
      assert.equal(mode, 'readwrite');
      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore(name) {
          assert.equal(name, 'saves');
          return {
            put(value, key) {
              records.set(key, structuredClone(value));
              queueMicrotask(() => tx.oncomplete?.());
            },
            delete(key) {
              records.delete(key);
              queueMicrotask(() => tx.oncomplete?.());
            },
          };
        },
      };
      return tx;
    },
  };
  const storage = {
    getItem(key) {
      if (fail === 'getItem' && key === fallbackKey) {
        throw new DOMException('injected getItem failure', 'SecurityError');
      }
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (fail === 'setItem' && key === fallbackKey) {
        throw new DOMException('injected setItem failure', 'QuotaExceededError');
      }
      values.set(key, String(value));
    },
    removeItem(key) {
      if (fail === 'removeItem' && key === fallbackKey) {
        throw new DOMException('injected removeItem failure', 'QuotaExceededError');
      }
      values.delete(key);
    },
  };
  const idb = {
    async databases() {
      return [{ name: databaseName }];
    },
    open(name) {
      assert.equal(name, databaseName);
      const request = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
  const oldIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: idb });
  if (fail === 'getter') {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('injected localStorage getter failure', 'SecurityError');
      },
    });
  } else {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  }
  return {
    device: api.createDevicePorts({}),
    records,
    storage,
    readStored: (key) => (values.has(key) ? values.get(key) : null),
    restore() {
      if (oldIdb) Object.defineProperty(globalThis, 'indexedDB', oldIdb);
      else delete globalThis.indexedDB;
      if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage);
      else delete globalThis.localStorage;
    },
  };
}

test('Quiet setItem failure propagates after IDB commit', async () => {
  const f = fixture({ fail: 'setItem' });
  const imported = { schema: 1, revision: 2, scene: { room: 'imported' } };
  try {
    await assert.rejects(
      f.device.write('quiet', { state: imported }),
      (error) => error.name === 'QuotaExceededError',
    );
    assert.deepEqual(f.records.get('state'), imported);
    assert.deepEqual(JSON.parse(f.storage.getItem(fallbackKey)), originalState);
  } finally {
    f.restore();
  }
});

test('Quiet localStorage getter failure propagates after IDB commit', async () => {
  const f = fixture({ fail: 'getter' });
  const imported = { schema: 1, revision: 2, scene: { room: 'imported' } };
  try {
    await assert.rejects(
      f.device.write('quiet', { state: imported }),
      (error) => error.name === 'SecurityError',
    );
    assert.deepEqual(f.records.get('state'), imported);
    assert.deepEqual(JSON.parse(f.storage.getItem(fallbackKey)), originalState);
  } finally {
    f.restore();
  }
});

test('Quiet getItem failure propagates after IDB commit', async () => {
  const f = fixture({ fail: 'getItem' });
  const imported = { schema: 1, revision: 2, scene: { room: 'imported' } };
  try {
    await assert.rejects(
      f.device.write('quiet', { state: imported }),
      (error) => error.name === 'SecurityError',
    );
    assert.deepEqual(f.records.get('state'), imported);
    assert.equal(f.readStored(fallbackKey), JSON.stringify(originalState));
  } finally {
    f.restore();
  }
});

test('Quiet removeItem failure propagates after IDB delete', async () => {
  const f = fixture({ fail: 'removeItem' });
  try {
    await assert.rejects(
      f.device.write('quiet', { state: null }),
      (error) => error.name === 'QuotaExceededError',
    );
    assert.equal(f.records.has('state'), false);
    assert.deepEqual(JSON.parse(f.storage.getItem(fallbackKey)), originalState);
  } finally {
    f.restore();
  }
});

test('Quiet writer does not create an absent localStorage fallback', async () => {
  const f = fixture({ fallback: null, fail: 'setItem' });
  const imported = { schema: 1, revision: 2, scene: { room: 'imported' } };
  try {
    await f.device.write('quiet', { state: imported });
    assert.deepEqual(f.records.get('state'), imported);
    assert.equal(f.storage.getItem(fallbackKey), null);
  } finally {
    f.restore();
  }
});
