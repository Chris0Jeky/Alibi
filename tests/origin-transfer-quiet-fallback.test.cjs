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
  const recovery = new Map();
  const opened = [];
  const values = new Map();
  if (fallback !== null) values.set(fallbackKey, JSON.stringify(fallback));

  const db = {
    objectStoreNames: { contains: (name) => name === 'saves' },
    close() {},
    transaction(storeName, mode) {
      assert.equal(storeName, 'saves');
      assert.ok(mode === 'readwrite' || mode === 'readonly');
      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        aborted: false,
        abort() {
          tx.aborted = true;
          queueMicrotask(() => tx.onabort?.());
        },
        objectStore(name) {
          assert.equal(name, 'saves');
          return {
            transaction: tx,
            get(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = structuredClone(records.get(key));
                request.onsuccess?.();
                queueMicrotask(() => {
                  if (!tx.aborted) tx.oncomplete?.();
                });
              });
              return request;
            },
            count(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = records.has(key) ? 1 : 0;
                request.onsuccess?.();
                queueMicrotask(() => tx.oncomplete?.());
              });
              return request;
            },
            getKey(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = records.has(key) ? key : undefined;
                request.onsuccess?.();
              });
              return request;
            },
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
      opened.push(name);
      if (name === 'alibi-origin-recovery') {
        const request = {};
        queueMicrotask(() => {
          request.result = {
            objectStoreNames: { contains: (store) => store === 'copies' },
            close() {},
            transaction(storeName, mode) {
              assert.equal(storeName, 'copies');
              assert.equal(mode, 'readwrite');
              const tx = {
                objectStore: () => ({
                  add(value, key) {
                    recovery.set(key, structuredClone(value));
                    queueMicrotask(() => tx.oncomplete?.());
                  },
                }),
              };
              return tx;
            },
          };
          request.onsuccess?.();
        });
        return request;
      }
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
    recovery,
    opened,
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

for (const kind of ['retained', 'active']) {
  test(`${kind} Quiet state remains exportable but blocks transfer retention and replacement`, async () => {
    const f = fixture({ fallback: null });
    f.records.delete('state');
    f.storage.setItem(fallbackKey, RAW_FALLBACK);
    const state = JSON.parse(RAW_FALLBACK);
    globalThis.QWApp = kind === 'active' ? { state, disposed: false } : { disposed: true };
    if (kind === 'retained') globalThis.QWRetainedState = state;
    const writes = [];
    const stub = { stub: true };
    const ports = {
      read: (name) => (name === 'quiet' ? f.device.read(name) : stub),
      write: (name) => writes.push(name),
      retain: (snapshot) => f.device.retain(snapshot),
      release: () => assert.fail('refused import cannot release recovery'),
    };
    try {
      const quiet = await f.device.read('quiet');
      assert.deepEqual(quiet.state, state, 'export reads the state');
      const exported = await api.exportOriginTransfer({
        cabinet: { format: 'alibi-backup', schemaVersion: 1, runs: [], packs: [] },
        club: { schema: 1, settings: {}, runs: {}, records: [] },
        quiet,
        castle: { format: 'alibi-castle', version: 1, scope: 'Castle', state: null, record: null },
        challenges: { format: 'alibi-challenges', schema: 1, runs: [] },
      });
      assert.deepEqual(JSON.parse(exported.payload).quiet.state, state, 'transfer export succeeds');
      await assert.rejects(
        api.applyOriginTransfer(
          {
            payload: {
              cabinet: stub,
              club: stub,
              quiet: { state: null },
              castle: stub,
              challenges: stub,
            },
          },
          ports,
          { confirmed: true },
        ),
        /Quiet Wing.*(?:export|close|resolve)/i,
      );
      assert.deepEqual(writes, []);
      assert.equal(f.opened.includes('alibi-origin-recovery'), false);
      assert.equal(f.recovery.size, 0);
      assert.equal(f.records.has('state'), false);
      assert.equal(f.readStored(fallbackKey), RAW_FALLBACK);
    } finally {
      delete globalThis.QWApp;
      delete globalThis.QWRetainedState;
      f.restore();
    }
  });
}

test('healthy fallback-only snapshot can still be admitted for transfer', async () => {
  const f = fixture({ fallback: null });
  f.records.delete('state');
  f.storage.setItem(fallbackKey, RAW_FALLBACK);
  try {
    const quiet = await f.device.read('quiet');
    await f.device.retain({ quiet });
    assert.equal(f.recovery.has('pending'), true);
    assert.deepEqual(f.recovery.get('pending').quiet.state, JSON.parse(RAW_FALLBACK));
    assert.equal(f.records.has('state'), false);
    assert.equal(f.readStored(fallbackKey), RAW_FALLBACK);
  } finally {
    f.restore();
  }
});

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

// The fallback can legitimately differ from the IndexedDB record (Quiet Wing once ran in
// localStorage mode). Rollback must restore its original bytes, not the IndexedDB snapshot.
const RAW_FALLBACK = JSON.stringify({ schema: 1, revision: 9, scene: { room: 'newer' } }, null, 1);

function applyWithFailingCastle(f, imported, failOnce = false, onFailure = () => {}) {
  const stub = { stub: true, runs: [] };
  let failed = false;
  const ports = {
    read: (name) => (name === 'quiet' ? f.device.read(name) : stub),
    write: (name, value, attempted) => {
      if (name === 'castle' && (!failOnce || !failed)) {
        failed = true;
        onFailure();
        throw Error('castle write failed');
      }
      return name === 'quiet' ? f.device.write(name, value, attempted) : undefined;
    },
    retain: async () => {},
    release: async () => {},
  };
  return api.applyOriginTransfer(
    {
      payload: {
        cabinet: stub,
        club: stub,
        quiet: { state: imported },
        castle: stub,
        challenges: stub,
      },
    },
    ports,
    { confirmed: true },
  );
}

test('fallback-only clean rollback restores exact bytes and leaves the Quiet key absent', async () => {
  const f = fixture({ fallback: null });
  f.records.delete('state');
  f.storage.setItem(fallbackKey, RAW_FALLBACK);
  try {
    await assert.rejects(
      applyWithFailingCastle(f, { schema: 1, revision: 2, scene: { room: 'imported' } }, true),
      /castle write failed.*Existing saves were not changed\./,
    );
    assert.equal(f.records.has('state'), false);
    assert.equal(f.readStored(fallbackKey), RAW_FALLBACK);
  } finally {
    f.restore();
  }
});

test('fallback-only rollback keeps a different concurrent Quiet record and reports incomplete rollback', async () => {
  const f = fixture({ fallback: null });
  f.records.delete('state');
  f.storage.setItem(fallbackKey, RAW_FALLBACK);
  const newer = { schema: 1, revision: 7, scene: { room: 'concurrent' } };
  try {
    await assert.rejects(
      applyWithFailingCastle(f, { schema: 1, revision: 2, scene: { room: 'imported' } }, true, () =>
        f.records.set('state', newer),
      ),
      /recovery copy was kept/i,
    );
    assert.deepEqual(f.records.get('state'), newer);
  } finally {
    f.restore();
  }
});

test('Rollback restores a divergent Quiet fallback byte-for-byte', async () => {
  const f = fixture({ fallback: null });
  f.storage.setItem(fallbackKey, RAW_FALLBACK);
  const imported = { schema: 1, revision: 2, scene: { room: 'imported' } };
  try {
    await assert.rejects(
      applyWithFailingCastle(f, imported),
      /Existing saves were not changed|recovery/,
    );
    assert.equal(f.readStored(fallbackKey), RAW_FALLBACK);
    assert.deepEqual(f.records.get('state'), originalState);
  } finally {
    f.restore();
  }
});

test('Clean rollback verifies the restored Quiet record and divergent fallback', async () => {
  const f = fixture({ fallback: null });
  f.storage.setItem(fallbackKey, RAW_FALLBACK);
  const imported = { schema: 1, revision: 2, scene: { room: 'imported' } };
  try {
    await assert.rejects(
      applyWithFailingCastle(f, imported, true),
      /castle write failed.*Existing saves were not changed\./,
    );
    assert.equal(f.readStored(fallbackKey), RAW_FALLBACK);
    assert.deepEqual(f.records.get('state'), originalState);
  } finally {
    f.restore();
  }
});

test('Rollback after a failed fallback removal leaves the divergent fallback untouched', async () => {
  const f = fixture({ fallback: null, fail: 'removeItem' });
  f.storage.setItem(fallbackKey, RAW_FALLBACK);
  try {
    const before = await f.device.read('quiet');
    await assert.rejects(f.device.write('quiet', { state: null }), {
      name: 'QuotaExceededError',
    });
    await f.device.write('quiet', before);
    assert.equal(f.readStored(fallbackKey), RAW_FALLBACK);
    assert.deepEqual(f.records.get('state'), originalState);
  } finally {
    f.restore();
  }
});

test('Quiet section read keeps raw fallback bytes out of serialised copies', async () => {
  const f = fixture({ fallback: null });
  f.storage.setItem(fallbackKey, RAW_FALLBACK);
  try {
    const section = await f.device.read('quiet');
    assert.deepEqual(Object.keys(section), ['kind', 'schema', 'state']);
    assert.equal(JSON.stringify(section).includes('newer'), false);
    assert.equal(JSON.stringify(structuredClone(section)), JSON.stringify(section));
  } finally {
    f.restore();
  }
});

// Leaving Quiet Wing disposes the mount but leaves G.QWApp pointing at the detached app.
// A second tab's newer commit must still be what a transfer export reads.
test('Quiet read prefers the committed record once the mount is disposed', async () => {
  const f = fixture({ fallback: null });
  const newer = { schema: 1, revision: 2, scene: { room: 'second tab' } };
  const detached = { state: structuredClone(originalState), disposed: true };
  globalThis.QWApp = detached;
  try {
    f.records.set('state', structuredClone(newer));
    assert.deepEqual((await f.device.read('quiet')).state, newer);
    // Unsaved state kept by dispose (dirty, session-only or blocked) still wins over the record.
    const unsaved = { schema: 1, revision: 3, scene: { room: 'unsaved' } };
    globalThis.QWRetainedState = unsaved;
    assert.deepEqual((await f.device.read('quiet')).state, unsaved);
    delete globalThis.QWRetainedState;
    // A mounted activity is still the live source.
    delete detached.disposed;
    assert.deepEqual((await f.device.read('quiet')).state, originalState);
  } finally {
    delete globalThis.QWApp;
    delete globalThis.QWRetainedState;
    f.restore();
  }
});

test('Quiet Wing dispose marks the published app as detached', () => {
  const source = require('node:fs').readFileSync(
    require.resolve('../src/quiet-wing/app.js'),
    'utf8',
  );
  const dispose = source.slice(source.indexOf('dispose() {'), source.indexOf('listeners.abort();'));
  assert.match(dispose, /A\.disposed = true;/);
});
