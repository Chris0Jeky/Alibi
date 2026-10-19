'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/origin-transfer.js'), 'utf8');
const clone = (value) => structuredClone(value);

// Model serialized readwrite transactions and commit/abort, including both put
// and add. The separate browser fixture proves these contracts with real IDB.
function database(options = {}) {
  let records = new Map(
    Object.hasOwn(options, 'pending') ? [['pending', clone(options.pending)]] : [],
  );
  let queue = Promise.resolve();
  const indexedDB = {
    async databases() {
      return [{ name: 'alibi-origin-recovery' }];
    },
    open(name, version) {
      assert.equal(name, 'alibi-origin-recovery');
      assert.ok(version === undefined || version === 1);
      const request = {};
      queueMicrotask(() => {
        if (options.openError) {
          request.error = options.openError;
          request.onerror();
          return;
        }
        request.result = {
          objectStoreNames: { contains: () => true },
          close() {},
          transaction(storeName, mode) {
            assert.equal(storeName, 'copies');
            assert.equal(mode, 'readwrite');
            const operations = [];
            const tx = {
              objectStore: () => ({
                put: (value, key) => operations.push(['put', key, clone(value)]),
                add: (value, key) => operations.push(['add', key, clone(value)]),
                delete: (key) => operations.push(['delete', key]),
              }),
            };
            queue = queue.then(() => {
              try {
                if (options.writeError) throw options.writeError;
                const next = new Map(records);
                for (const [operation, key, value] of operations) {
                  if (operation === 'add' && next.has(key))
                    throw new DOMException(
                      'A recovery copy is already pending.',
                      'ConstraintError',
                    );
                  if (operation === 'delete') next.delete(key);
                  else next.set(key, value);
                }
                if (options.abort) throw new DOMException('Transaction aborted.', 'AbortError');
                records = next;
                tx.oncomplete();
              } catch (error) {
                tx.error = error;
                tx.onabort();
              }
            });
            return tx;
          },
        };
        request.onsuccess();
      });
      return request;
    },
  };
  return { indexedDB, pending: () => clone(records.get('pending')) };
}

function api(db) {
  const context = { indexedDB: db.indexedDB };
  vm.runInNewContext(source, context);
  return context.AlibiOriginTransfer;
}

test('first recovery retention commits the complete snapshot', async () => {
  const db = database();
  const snapshot = { cabinet: { note: 'original ☂' }, quiet: null };
  await api(db).createDevicePorts({}).retain(snapshot);
  assert.deepEqual(db.pending(), snapshot);
});

test('an existing pending recovery rejects and preserves its original bytes', async () => {
  const original = { cabinet: { note: 'retained original ☂' }, revision: 7 };
  const db = database({ pending: original });
  const before = JSON.stringify(db.pending());
  await assert.rejects(api(db).createDevicePorts({}).retain({ replacement: true }));
  assert.equal(JSON.stringify(db.pending()), before);
});

test('present falsy and unknown pending copies remain protected', async () => {
  for (const pending of [null, '', false, 0, { unknown: 'future recovery format' }]) {
    const db = database({ pending });
    await assert.rejects(api(db).createDevicePorts({}).retain({ replacement: true }));
    assert.deepEqual(db.pending(), pending);
  }
});

test('the actual coordinator refuses pending recovery before any domain write or release', async () => {
  const original = { retained: 'before an interrupted import' };
  const db = database({ pending: original });
  const transfer = api(db);
  const ports = transfer.createDevicePorts({});
  let writes = 0,
    releases = 0;
  ports.read = async () => ({ current: true });
  ports.write = async () => {
    writes++;
  };
  ports.release = async () => {
    releases++;
  };
  await assert.rejects(transfer.applyOriginTransfer({ payload: {} }, ports, { confirmed: true }));
  assert.equal(writes, 0);
  assert.equal(releases, 0);
  assert.deepEqual(db.pending(), original);
});

test('concurrent recovery contenders admit exactly one complete snapshot', async () => {
  const db = database();
  const left = { owner: 'left', note: 'complete left copy' };
  const right = { owner: 'right', note: 'complete right copy' };
  const outcomes = await Promise.allSettled([
    api(db).createDevicePorts({}).retain(left),
    api(db).createDevicePorts({}).retain(right),
  ]);
  assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1);
  const winner = outcomes[0].status === 'fulfilled' ? left : right;
  assert.deepEqual(db.pending(), winner);
});

test('open and quota failures retain their original errors and do not admit recovery', async () => {
  for (const [key, name] of [
    ['openError', 'SecurityError'],
    ['writeError', 'QuotaExceededError'],
  ]) {
    const error = new DOMException('Storage unavailable.', name);
    const db = database({ [key]: error });
    await assert.rejects(
      api(db).createDevicePorts({}).retain({ original: true }),
      (e) => e === error,
    );
    assert.equal(db.pending(), undefined);
  }
});

test('a successful release permits the next recovery admission', async () => {
  const db = database();
  const ports = api(db).createDevicePorts({});
  await ports.retain({ owner: 'first' });
  await ports.release();
  assert.equal(db.pending(), undefined);
  await ports.retain({ owner: 'second' });
  assert.deepEqual(db.pending(), { owner: 'second' });
});

test('an aborted retention transaction admits no snapshot', async () => {
  const db = database({ abort: true });
  await assert.rejects(api(db).createDevicePorts({}).retain({ original: true }), {
    name: 'AbortError',
  });
  assert.equal(db.pending(), undefined);
});
