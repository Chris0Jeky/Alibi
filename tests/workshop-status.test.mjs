import test from 'node:test';
import assert from 'node:assert/strict';
import { readPackStatuses } from '../src/workshop-add.mjs';

function store(rows, { fail = false } = {}) {
  let writes = 0;
  return {
    fatal: false,
    mode: 'indexeddb',
    db: {
      transaction(name, mode) {
        assert.equal(name, 'packs');
        assert.equal(mode, 'readonly');
        const tx = {
          objectStore() {
            return {
              openCursor() {
                const req = {};
                let i = 0;
                queueMicrotask(function advance() {
                  if (fail) {
                    tx.onabort?.();
                    return;
                  }
                  if (i === rows.length) {
                    req.result = null;
                    req.onsuccess();
                    tx.oncomplete?.();
                    return;
                  }
                  const row = rows[i++];
                  req.result = {
                    primaryKey: row.primaryKey ?? row.key,
                    value: row,
                    continue() {
                      queueMicrotask(advance);
                    },
                  };
                  req.onsuccess();
                });
                return req;
              },
              put() {
                writes++;
              },
            };
          },
          abort() {
            tx.onabort?.();
          },
        };
        return tx;
      },
    },
    get writes() {
      return writes;
    },
  };
}
const entries = [{ packId: 'curated-one' }, { packId: 'curated-two' }];
const validate = (p) => {
  if (p.schemaVersion !== 1 || !Array.isArray(p.puzzles)) throw Error('invalid');
  return p;
};
const row = (id) => ({ key: id, value: { schemaVersion: 1, id, puzzles: [] } });
test('fresh status reports matching IDs without claiming curated provenance or mutating rows', async () => {
  const s = store([row('curated-one')]);
  assert.deepEqual(await readPackStatuses(s, entries, validate), ['matching-id', 'absent']);
  assert.equal(s.writes, 0);
  s.db = store([row('curated-two')]).db;
  assert.deepEqual(await readPackStatuses(s, entries, validate), ['absent', 'matching-id']);
});
test('damaged, mismatched, unavailable and aborted reads never assert presence or absence', async () => {
  for (const s of [
    store([{ key: 'curated-one', value: { schemaVersion: 99 } }]),
    store([{ key: 'bad', value: row('curated-one').value }]),
    store([{ key: 'curated-one', primaryKey: 'different', value: row('curated-one').value }]),
    store([], { fail: true }),
    { mode: 'local', db: null },
    { fatal: true, db: {} },
  ])
    assert.deepEqual(await readPackStatuses(s, entries, validate), ['unknown', 'unknown']);
});
test('closing the dialog aborts a stalled read and leaves status unknown', async () => {
  let aborted = 0;
  const s = {
    mode: 'indexeddb',
    db: {
      transaction() {
        const tx = {
          objectStore() {
            return {
              openCursor() {
                return {};
              },
            };
          },
          abort() {
            aborted++;
            tx.onabort?.();
          },
        };
        return tx;
      },
    },
  };
  const c = new AbortController();
  const pending = readPackStatuses(s, entries, validate, c.signal);
  c.abort();
  assert.equal(aborted, 1);
  assert.deepEqual(await pending, ['unknown', 'unknown']);
  assert.equal(aborted, 1);
});
test('too many saved puzzle definitions leave all statuses unknown', async () => {
  const large = Array.from({ length: 21 }, (_, i) => ({
    key: `p${i}`,
    value: { schemaVersion: 1, id: `p${i}`, puzzles: Array(150).fill(null) },
  }));
  assert.deepEqual(await readPackStatuses(store(large), entries, validate), ['unknown', 'unknown']);
});
test('timeout cleans up listener even if abort throws; a partial cursor is not a snapshot', async () => {
  let callback;
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    callback = fn;
    return 0;
  };
  const c = new AbortController();
  let aborted = 0;
  const s = {
    mode: 'indexeddb',
    db: {
      transaction() {
        return {
          objectStore() {
            return {
              openCursor() {
                const request = {};
                queueMicrotask(() => {
                  request.result = null;
                  request.onsuccess();
                });
                return request;
              },
            };
          },
          abort() {
            aborted++;
            throw Error('abort failed');
          },
        };
      },
    },
  };
  let pending;
  try {
    pending = readPackStatuses(s, entries, validate, c.signal);
  } finally {
    globalThis.setTimeout = original;
  }
  await Promise.resolve();
  callback();
  assert.deepEqual(await pending, ['unknown', 'unknown']);
  c.abort();
  assert.equal(aborted, 1);
});
