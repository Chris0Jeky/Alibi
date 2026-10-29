'use strict';
// The queue below models transaction ordering/abort for contract tests. Real two-tab
// IndexedDB acceptance lives in workshop_add_browser.py; this is not a browser proof.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const clone = (value) => structuredClone(value);
const plain = (value) => JSON.parse(JSON.stringify(value));
const sample = require('../content/workshop/afterlight-pictures.json');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const install = app.slice(
  app.indexOf('  async function installPack(p) {'),
  app.indexOf('  async function importPack(file) {'),
);

function pack(id = 'test-pack', puzzleId = 'test-picture') {
  return {
    ...clone(sample),
    id,
    title: id,
    puzzles: [{ ...clone(sample.puzzles[0]), id: puzzleId }],
  };
}

function disk(seed = []) {
  let rows = new Map(seed.map((row) => [row.key, clone(row)]));
  let active = false;
  const waiting = [];
  const state = { writes: 0, failWrite: false };
  const next = () => {
    if (!active && waiting.length) {
      active = true;
      setImmediate(waiting.shift());
    }
  };
  return {
    state,
    rows: () => [...rows.values()].map(clone),
    transaction(names, mode) {
      assert.equal(names, 'packs', 'pack admission owns only the packs store');
      assert.equal(mode, 'readwrite');
      let working,
        finished = false,
        started = false;
      const operations = [],
        listeners = {};
      const tx = {
        error: null,
        addEventListener(name, callback) {
          (listeners[name] ||= []).push(callback);
        },
        abort() {
          if (finished) return;
          finished = true;
          for (const listener of listeners.abort || []) listener();
          tx.onabort?.();
          active = false;
          next();
        },
        objectStore(name) {
          assert.equal(name, 'packs');
          const write = (row, add) =>
            enqueue(() => {
              if (state.failWrite) throw Error('simulated quota failure');
              if (add && working.has(row.key)) throw Error('ConstraintError');
              working.set(row.key, clone(row));
              state.writes++;
            });
          return {
            put: (row) => write(row, false),
            add: (row) => write(row, true),
            openCursor() {
              const request = {};
              let entries,
                index = 0;
              const read = () => {
                entries ||= [...working.values()];
                const row = entries[index++];
                return row
                  ? {
                      key: row.key,
                      value: clone(row),
                      continue: () => enqueue(read, request),
                    }
                  : null;
              };
              return enqueue(read, request);
            },
          };
        },
      };
      const pump = () => {
        if (finished || !started) return;
        const operation = operations.shift();
        if (!operation) {
          finished = true;
          rows = working;
          for (const listener of listeners.complete || []) listener();
          tx.oncomplete?.();
          active = false;
          next();
          return;
        }
        setImmediate(() => {
          if (finished) return;
          try {
            operation.request.result = operation.run();
            operation.request.onsuccess?.();
          } catch (error) {
            operation.request.error = error;
            operation.request.onerror?.({ target: operation.request });
            for (const listener of listeners.error || []) listener({ target: operation.request });
            tx.onerror?.({ target: operation.request });
            tx.error = error;
            tx.abort();
          }
          pump();
        });
      };
      function enqueue(run, request = {}) {
        operations.push({ run, request });
        return request;
      }
      waiting.push(() => {
        working = new Map([...rows].map(([key, row]) => [key, clone(row)]));
        started = true;
        pump();
      });
      next();
      return tx;
    },
  };
}

function tab(database, official = { id: 'official', puzzles: [{ id: 'official-picture' }] }) {
  const local = new Map();
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    Event,
    dispatchEvent() {},
    localStorage: {
      setItem: (key, value) => local.set(key, String(value)),
      getItem: (key) => local.get(key) ?? null,
      removeItem: (key) => local.delete(key),
      key: (index) => [...local.keys()][index] ?? null,
      get length() {
        return local.size;
      },
    },
  });
  for (const name of ['core.js', 'engines.js', 'bridges.js', 'storage.js'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src', name), 'utf8'), context);
  const store = new context.AlibiStorage.Store();
  store.db = database;
  store.mode = 'indexeddb';
  Object.assign(context, { store, starter: clone(official), render() {}, toast() {} });
  const api = vm.runInContext(
    '(function () { const C = AlibiCore; let packs = [starter];' +
      'function all() { return packs.flatMap(p => p.puzzles); }' +
      install +
      'return {install: installPack, packs: () => packs}; })()',
    context,
  );
  return { ...api, store, local };
}

test('a stale tab cannot overwrite a pack installed after that tab loaded', async () => {
  const db = disk(),
    a = tab(db),
    b = tab(db),
    first = pack();
  await a.install(first);
  const before = db.rows();
  const changed = { ...first, title: 'A different definition from a stale tab' };
  await assert.rejects(b.install(changed), /already installed/);
  assert.deepEqual(db.rows(), before);
  assert.equal(b.packs().length, 1, 'rejected content is not published to the stale tab');
});

test('a stale tab cannot install a different pack containing an existing puzzle ID', async () => {
  const db = disk(),
    a = tab(db),
    b = tab(db);
  await a.install(pack('pack-one', 'shared-picture'));
  const before = db.rows();
  await assert.rejects(b.install(pack('pack-two', 'shared-picture')), /puzzle ID/);
  assert.deepEqual(db.rows(), before);
});

test('simultaneous tabs admit one duplicate and preserve the winning record', async () => {
  const db = disk(),
    a = tab(db),
    b = tab(db);
  const outcomes = await Promise.allSettled([
    a.install(pack('same-pack', 'picture-a')),
    b.install(pack('same-pack', 'picture-b')),
  ]);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(db.rows().length, 1);
  assert.equal(db.state.writes, 1);
});

test('distinct concurrent imports both commit without losing either pack', async () => {
  const db = disk(),
    a = tab(db),
    b = tab(db);
  await Promise.all([
    a.install(pack('pack-one', 'picture-a')),
    b.install(pack('pack-two', 'picture-b')),
  ]);
  assert.deepEqual(
    db
      .rows()
      .map((row) => row.key)
      .sort(),
    ['pack-one', 'pack-two'],
  );
});

for (const value of [
  null,
  { ...pack(), schemaVersion: 99 },
  { ...pack(), puzzles: 'unknown' },
  { ...pack(), id: 'different-record-id' },
]) {
  test(
    'damaged or unsupported stored pack blocks admission without rewriting it: ' +
      JSON.stringify(value?.schemaVersion ?? value),
    async () => {
      const db = disk([{ key: 'test-pack', value }]),
        current = tab(db);
      const before = db.rows();
      await assert.rejects(
        current.install(pack('new-pack', 'new-picture')),
        /stored pack|Stored pack/,
      );
      assert.deepEqual(db.rows(), before);
      assert.equal(db.state.writes, 0);
    },
  );
}

test('the 3000-puzzle bound includes packs installed since this tab loaded', async () => {
  const official = {
    id: 'official',
    puzzles: Array.from({ length: 2999 }, (_, i) => ({ id: 'official-' + i })),
  };
  const db = disk(),
    a = tab(db, official),
    b = tab(db, official);
  await a.install(pack('last-pack', 'last-picture'));
  const before = db.rows();
  await assert.rejects(b.install(pack('overflow-pack', 'overflow-picture')), /3,000/);
  assert.deepEqual(db.rows(), before);
});

test('official pack and puzzle identities remain reserved', async () => {
  const db = disk(),
    current = tab(db);
  await assert.rejects(current.install(pack('official', 'new-picture')), /already installed/);
  await assert.rejects(current.install(pack('new-pack', 'official-picture')), /puzzle ID/);
  assert.deepEqual(db.rows(), []);
});

test('same-schema extension metadata on an existing pack is preserved', async () => {
  const existing = pack('existing-pack', 'existing-picture');
  existing.unknownFuture = { note: 'retain these bytes', nested: [1, 2] };
  const db = disk([{ key: existing.id, value: existing }]);
  const before = db.rows()[0];
  await tab(db).install(pack('new-pack', 'new-picture'));
  assert.deepEqual(
    db.rows().find((row) => row.key === existing.id),
    before,
  );
});

test('failed storage commit does not publish a pack to the application', async () => {
  const db = disk(),
    current = tab(db);
  db.state.failWrite = true;
  await assert.rejects(current.install(pack()), /quota/);
  assert.deepEqual(db.rows(), []);
  assert.equal(current.packs().length, 1);
});

test('caller mutation after admission starts cannot alter the stored pack', async () => {
  const db = disk(),
    current = tab(db),
    input = pack(),
    expected = clone(input);
  const pending = current.install(input);
  input.title = 'Changed while the transaction was queued';
  input.puzzles[0].id = 'changed-picture';
  await pending;
  assert.deepEqual(plain(db.rows()[0].value), expected);
});

test('localStorage fallback refuses a non-atomic persistent installation', async () => {
  const current = tab(null);
  current.store.mode = 'local';
  current.local.set('alibi.v1.packs.legacy', '{"unreadable-future-pack":true}');
  const before = [...current.local];
  await assert.rejects(current.install(pack()), /IndexedDB/);
  assert.equal(current.packs().length, 1);
  assert.deepEqual([...current.local], before);
});

test('session-only installation remains local to its Store and rejects duplicates', async () => {
  const a = tab(null),
    b = tab(null);
  a.store.mode = b.store.mode = 'session';
  await a.install(pack());
  await assert.rejects(a.install(pack()), /already installed/);
  await b.install(pack());
  assert.equal(a.packs().length, 2);
  assert.equal(b.packs().length, 2);
});
