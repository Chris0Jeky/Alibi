import test from 'node:test';
import assert from 'node:assert/strict';

import { openReplayStore } from '../src/block-cabinet/replay-store.mjs';

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(() => resolve({ hung: true }), milliseconds));

function installIndexedDB(t, open) {
  const hadOwn = Object.hasOwn(globalThis, 'indexedDB');
  const previous = globalThis.indexedDB;
  globalThis.indexedDB = { open };
  t.after(() => {
    if (hadOwn) globalThis.indexedDB = previous;
    else delete globalThis.indexedDB;
  });
}

function successfulOpen(db) {
  const request = {};
  queueMicrotask(() => {
    request.result = db;
    request.onsuccess?.();
  });
  return request;
}

test('a silent initial replay read aborts and opens a protected bounded session', async (t) => {
  let aborted = false;
  let closed = 0;
  const transaction = {
    objectStore: () => ({ get: () => ({}) }),
    abort() {
      aborted = true;
      this.onabort?.();
    },
  };
  const db = {
    transaction: () => transaction,
    close() {
      closed += 1;
    },
  };
  installIndexedDB(t, () => successfulOpen(db));

  const outcome = await Promise.race([
    openReplayStore({ timeout: 10 }).then((store) => ({ store })),
    delay(80),
  ]);

  assert.equal(outcome.hung, undefined, 'initial read must have bounded completion');
  assert.equal(aborted, true, 'the stalled readonly transaction is aborted');
  assert.equal(closed, 1, 'the ambiguous connection is closed');
  assert.deepEqual(outcome.store.diagnostics(), {
    mode: 'session',
    revision: 0,
    protectedSave: true,
    warning:
      'Storage unavailable or an existing replay is protected. Session only; export to keep it.',
  });
});

test('a silent replay save aborts, protects the session and rejects persistent replacement', async (t) => {
  let transactions = 0;
  let writeAborted = false;
  let closed = 0;
  const db = {
    transaction(_name, mode) {
      transactions += 1;
      if (mode === 'readonly') {
        const request = {};
        const transaction = {
          objectStore: () => ({
            get() {
              queueMicrotask(() => {
                request.result = undefined;
                request.onsuccess?.();
                transaction.oncomplete?.();
              });
              return request;
            },
          }),
          abort() {
            this.onabort?.();
          },
        };
        return transaction;
      }
      return {
        objectStore: () => ({ get: () => ({}), put() {} }),
        abort() {
          writeAborted = true;
          this.onabort?.();
        },
      };
    },
    close() {
      closed += 1;
    },
  };
  installIndexedDB(t, () => successfulOpen(db));
  const store = await openReplayStore({ timeout: 10 });
  assert.equal(store.diagnostics().mode, 'indexeddb');

  const outcome = await Promise.race([
    store.commit(store.read(), { persistent: true }).then(
      () => ({ resolved: true }),
      (error) => ({ error }),
    ),
    delay(80),
  ]);

  assert.equal(outcome.hung, undefined, 'save must have bounded completion');
  assert.match(outcome.error?.message || '', /could not be saved/i);
  assert.equal(writeAborted, true, 'the stalled readwrite transaction is aborted');
  assert.equal(closed, 1, 'the ambiguous connection is closed');
  assert.equal(transactions, 2, 'one initial read and one attempted write');
  assert.deepEqual(store.diagnostics(), {
    mode: 'session',
    revision: 0,
    protectedSave: true,
    warning: 'The device could not save. Current play is session-only; export before leaving.',
  });
});

test('a final safe replay revision becomes session-only before an overflow write', async (t) => {
  let closed = 0;
  let writes = 0;
  const saved = {
    revision: Number.MAX_SAFE_INTEGER,
    value: { rules: 'cascade-cabinet-1', seed: 'ATELIER-01', log: [], redo: [] },
  };
  const db = {
    transaction() {
      const request = {};
      const transaction = {
        objectStore: () => ({
          get() {
            queueMicrotask(() => {
              request.result = saved;
              request.onsuccess?.();
              transaction.oncomplete?.();
            });
            return request;
          },
          put() {
            writes++;
          },
        }),
      };
      return transaction;
    },
    close() {
      closed++;
    },
  };
  installIndexedDB(t, () => successfulOpen(db));

  const store = await openReplayStore({ timeout: 10 });
  assert.equal(store.diagnostics().revision, Number.MAX_SAFE_INTEGER);

  await assert.rejects(store.commit(store.read(), { persistent: true }), /could not be saved/i);
  assert.equal(writes, 0, 'the terminal revision is never incremented into an unsafe value');
  assert.equal(closed, 1, 'the persistent connection is closed before falling back');
  assert.deepEqual(store.diagnostics(), {
    mode: 'session',
    revision: Number.MAX_SAFE_INTEGER,
    protectedSave: true,
    warning: 'Replay revision limit reached. Export this session before leaving.',
  });
});
