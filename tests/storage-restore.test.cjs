/* Store.restore expected-state conflict and pre-restore recovery in a Node VM.
   Same fake-IDB fixture shape as tests/storage.test.cjs, extended to seed packs
   and meta. Not a real browser IndexedDB atomicity or rollback test. */
'use strict';
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  path = require('node:path'),
  test = require('node:test');

function setup() {
  const items = new Map(),
    ls = {
      setItem(k, v) {
        items.set(k, String(v));
      },
      removeItem(k) {
        items.delete(k);
      },
      getItem: (k) => items.get(k) ?? null,
      key: (i) => [...items.keys()][i] ?? null,
      get length() {
        return items.size;
      },
    };
  const ctx = {
    structuredClone,
    Date,
    console,
    localStorage: ls,
    setTimeout,
    clearTimeout,
    Event: class Event {},
    dispatchEvent() {},
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8'), ctx);
  return { Store: ctx.AlibiStorage.Store };
}

function restoreFixture(seed) {
  const disk = {
    runs: new Map(Object.entries(seed.runs || {})),
    packs: new Map(Object.entries(seed.packs || {})),
    meta: new Map(Object.entries(seed.meta || {})),
  };
  // One transaction object per transaction() call, unlike the shared one in
  // tests/storage.test.cjs: export() runs several transactions first, and their
  // late completion timers must not complete the restore transaction.
  const transaction = () => {
    let aborted = false;
    const request = (result) => {
      const pending = { result, onsuccess: null, onerror: null };
      setTimeout(() => {
        if (!aborted && pending.onsuccess) pending.onsuccess();
      }, 0);
      return pending;
    };
    const tx = {
      oncomplete: null,
      onerror: null,
      onabort: null,
      listeners: { complete: [], error: [], abort: [] },
      addEventListener(ev, fn) {
        this.listeners[ev].push(fn);
      },
      abort() {
        aborted = true;
        setTimeout(() => {
          for (const f of this.listeners.abort)
            try {
              f();
            } catch {}
          if (this.onabort) this.onabort();
        }, 0);
      },
      objectStore(name) {
        const table = disk[name];
        return {
          get(key) {
            return request(
              table.has(key) ? { key, value: structuredClone(table.get(key)) } : undefined,
            );
          },
          getAll() {
            return request(
              [...table.entries()].map(([key, value]) => ({
                key,
                value: structuredClone(value),
              })),
            );
          },
          put(entry) {
            table.set(entry.key, structuredClone(entry.value));
          },
          clear() {
            table.clear();
          },
        };
      },
    };
    setTimeout(() => {
      if (aborted) return;
      for (const f of tx.listeners.complete)
        try {
          f();
        } catch {}
      if (tx.oncomplete) tx.oncomplete();
    }, 20);
    return tx;
  };
  return { disk, db: { transaction } };
}

function seedData() {
  return {
    runs: { 'scene-01@1': { key: 'scene-01@1', rev: 1 } },
    packs: { p1: { id: 'p1' } },
    meta: { settings: { sound: true }, preferences: { seen: ['scene'] } },
  };
}

function validBackup() {
  return {
    format: 'alibi-backup',
    schemaVersion: 1,
    runs: [{ key: 'scene-02@1', rev: 3 }],
    packs: [{ id: 'p2' }],
    settings: { sound: false },
    preferences: { seen: [] },
  };
}

async function seededStore(seed) {
  const { Store } = setup(),
    store = await new Store().init(),
    fixture = restoreFixture(seed);
  store.db = fixture.db;
  return { store, disk: fixture.disk };
}

function snap(disk) {
  return JSON.stringify({
    runs: [...disk.runs.entries()],
    packs: [...disk.packs.entries()],
    meta: [...disk.meta.entries()],
  });
}

// Values cross the vm boundary, so compare JSON-roundtripped copies: prototypes differ.
const plain = (value) => JSON.parse(JSON.stringify(value));

test('stale expected rejects with ConflictError and changes nothing', async () => {
  const { store, disk } = await seededStore(seedData()),
    expected = await store.export();
  disk.runs.set('other@1', { key: 'other@1', rev: 1 });
  const before = snap(disk);
  await assert.rejects(store.restore(validBackup(), expected), (e) => e.name === 'ConflictError');
  assert.equal(snap(disk), before);
  assert.equal(disk.meta.has('pre-restore-backup'), false);
  assert.deepEqual(plain(disk.runs.get('other@1')), { key: 'other@1', rev: 1 });
});

test('fresh expected replaces data and keeps pre-restore recovery', async () => {
  const { store, disk } = await seededStore(seedData()),
    expected = await store.export();
  await store.restore(validBackup(), expected);
  assert.deepEqual([...disk.runs.keys()], ['scene-02@1']);
  assert.deepEqual(plain(disk.runs.get('scene-02@1')), { key: 'scene-02@1', rev: 3 });
  assert.deepEqual([...disk.packs.keys()], ['p2']);
  assert.deepEqual(plain(disk.packs.get('p2')), { id: 'p2' });
  assert.deepEqual(plain(disk.meta.get('settings')), { sound: false });
  assert.deepEqual(plain(disk.meta.get('preferences')), { seen: [] });
  const recovery = plain(disk.meta.get('pre-restore-backup'));
  assert.equal(recovery.format, 'alibi-backup');
  assert.equal(recovery.schemaVersion, 1);
  assert.deepEqual(recovery.runs, [{ key: 'scene-01@1', rev: 1 }]);
  assert.deepEqual(recovery.packs, [{ id: 'p1' }]);
  assert.deepEqual(recovery.settings, { sound: true });
  assert.deepEqual(recovery.preferences, { seen: ['scene'] });
});

test('restore without expected still writes pre-restore recovery', async () => {
  const { store, disk } = await seededStore(seedData());
  await store.restore(validBackup());
  assert.deepEqual(plain(disk.meta.get('pre-restore-backup')).runs, [
    { key: 'scene-01@1', rev: 1 },
  ]);
});
