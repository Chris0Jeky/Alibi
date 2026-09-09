import test from 'node:test';
import assert from 'node:assert/strict';
import { CastleStore } from '../src/castle/storage.mjs';
import { initial, clone } from '../src/castle/engine.mjs';

function edit(store, text) {
  const next = clone(store.state);
  next.notes = text;
  next.revision++;
  return next;
}

test('Castle session edits remain exportable and block an unsafe update', async () => {
  const store = await new CastleStore(null).init();
  assert.equal(store.mode, 'session');
  await store.save(edit(store, 'Keep this notebook.'));
  await assert.rejects(store.flush());
  const file = JSON.parse(store.export());
  assert.equal(file.scope, 'Wrenmere Chapter I only');
  assert.equal(file.state.notes, 'Keep this notebook.');
  assert.equal(store.dirty, true);
});

test('Only explicit storage denial becomes a writable session', async () => {
  for (const name of ['SecurityError', 'NotSupportedError', 'UnknownError']) {
    const factory = {
      open() {
        throw Object.assign(Error('Test denial'), { name });
      },
    };
    const store = await new CastleStore(factory).init();
    assert.equal(store.mode, name === 'UnknownError' ? 'protected' : 'session');
    assert.equal(store.diskRevision, 0);
  }
});

test('An abandoned open closes its late connection', async () => {
  const request = {};
  let closed = 0;
  const store = await new CastleStore({ open: () => request }, 10).init();
  assert.equal(store.mode, 'protected');
  request.result = { close: () => closed++ };
  request.onsuccess();
  assert.equal(closed, 1);
});

test('A stalled transaction is aborted within its watchdog', async () => {
  let aborted = 0;
  const store = new CastleStore(null, 10);
  store.db = {
    transaction: () => ({
      objectStore: () => ({}),
      abort: () => aborted++,
    }),
  };
  await assert.rejects(store.transaction('readonly', () => {}), /timed out/);
  assert.equal(aborted, 1);
});

// This deterministic harness complements the real-origin IndexedDB tests.
function memoryTransactions() {
  let committed;
  let queue = Promise.resolve();
  function run(mode, operation) {
    return new Promise((resolve, reject) => {
      let result;
      let staged;
      let failure;
      const records = {
        get() {
          const request = {};
          queueMicrotask(() => {
            request.result = committed;
            request.onsuccess();
            if (failure) {
              reject(failure);
              return;
            }
            if (staged) committed = staged;
            resolve(result);
          });
          return request;
        },
        put(value) {
          assert.equal(mode, 'readwrite');
          staged = value;
        },
      };
      operation(records, (value) => (result = value), (error) => (failure = error));
    });
  }
  return {
    read: () => committed,
    attach(store) {
      store.mode = 'local';
      store.transaction = (mode, operation) => {
        const task = queue.then(() => run(mode, operation));
        queue = task.catch(() => {});
        return task;
      };
    },
  };
}

test('CAS keeps the first writer and retains a stale tab in protected mode', async () => {
  const disk = memoryTransactions();
  const first = new CastleStore(null);
  const stale = new CastleStore(null);
  disk.attach(first);
  disk.attach(stale);
  await Promise.all([
    first.save(edit(first, 'First writer.')),
    stale.save(edit(stale, 'Unsaved second writer.')),
  ]);
  assert.equal(disk.read().state.notes, 'First writer.');
  assert.equal(first.mode, 'local');
  assert.equal(stale.mode, 'protected');
  assert.equal(stale.state.notes, 'Unsaved second writer.');
  await assert.rejects(stale.flush());
});

test('Queued writes use committed revisions and retain the latest edit', async () => {
  const disk = memoryTransactions();
  const store = new CastleStore(null);
  disk.attach(store);
  store.save(edit(store, 'First line.'));
  store.save(edit(store, 'Second line.'));
  await store.flush();
  assert.equal(disk.read().revision, 2);
  assert.equal(disk.read().state.notes, 'Second line.');
  assert.equal(store.dirty, false);
  assert.throws(() => store.save(initial()), /advance/);
});
