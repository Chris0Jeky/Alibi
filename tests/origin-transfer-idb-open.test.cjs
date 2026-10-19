'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/origin-transfer.js'), 'utf8');

// Dispatch the browser callbacks at the public recovery port. These controls
// model request timing, not IndexedDB durability or cross-tab transactions.
function fixture(openError, transactionError) {
  const calls = {
    closes: 0,
    upgrades: 0,
    aborts: 0,
    transactions: 0,
    writes: [],
  };
  const request = {
    transaction: { abort: () => calls.aborts++ },
    result: {
      objectStoreNames: { contains: () => false },
      createObjectStore: () => calls.upgrades++,
      close: () => calls.closes++,
      transaction() {
        calls.transactions++;
        if (transactionError) throw transactionError;
        const tx = {
          objectStore: () => ({
            put: (value, key) => calls.writes.push({ value, key }),
            add: (value, key) => calls.writes.push({ value, key }),
          }),
        };
        queueMicrotask(() => tx.oncomplete());
        return tx;
      },
    },
  };
  const context = {
    indexedDB: {
      open(name, version) {
        assert.equal(name, 'alibi-origin-recovery');
        assert.equal(version, 1);
        if (openError) throw openError;
        return request;
      },
    },
  };
  vm.runInNewContext(source, context);
  const pending = context.AlibiOriginTransfer.createDevicePorts({}).retain({
    original: 'snapshot',
  });
  return { calls, request, pending };
}

test('a blocked recovery open rejects and closes its later successful handle once', async () => {
  const f = fixture();
  f.request.onblocked();
  await assert.rejects(f.pending, /Another tab is blocking storage/);
  f.request.onsuccess();
  await Promise.resolve();
  assert.equal(f.calls.closes, 1);
  assert.equal(f.calls.transactions, 0);
  assert.equal(f.calls.upgrades, 0);
  assert.deepEqual(f.calls.writes, []);
});

test('a blocked recovery open aborts a later upgrade without creating a store', async () => {
  const f = fixture();
  f.request.onblocked();
  await assert.rejects(f.pending, /Another tab is blocking storage/);
  f.request.onupgradeneeded();
  assert.equal(f.calls.aborts, 1);
  assert.equal(f.calls.upgrades, 0);
  assert.equal(f.calls.transactions, 0);
  assert.deepEqual(f.calls.writes, []);
  f.request.error = Error('aborted upgrade');
  f.request.onerror();
  await assert.rejects(f.pending, /Another tab is blocking storage/);
});

test('a healthy recovery open still upgrades, writes and closes normally', async () => {
  const f = fixture();
  f.request.onupgradeneeded();
  f.request.onsuccess();
  await f.pending;
  assert.equal(f.calls.upgrades, 1);
  assert.equal(f.calls.transactions, 1);
  assert.equal(f.calls.closes, 1);
  assert.equal(f.calls.aborts, 0);
  assert.equal(f.calls.writes.length, 1);
  assert.equal(f.calls.writes[0].key, 'pending');
  assert.equal(f.calls.writes[0].value.original, 'snapshot');
});

test('ordinary and synchronous recovery open failures retain their original errors', async () => {
  const error = Error('storage unavailable');
  const f = fixture();
  f.request.error = error;
  f.request.onerror();
  await assert.rejects(f.pending, (actual) => actual === error);
  assert.equal(f.calls.closes, 0);
  assert.equal(f.calls.transactions, 0);
  await assert.rejects(fixture(error).pending, (actual) => actual === error);
});

test('a synchronous transaction failure retains its original error and closes the database', async () => {
  const error = Error('transaction unavailable');
  const f = fixture(undefined, error);
  f.request.onsuccess();
  await assert.rejects(f.pending, (actual) => actual === error);
  assert.equal(f.calls.transactions, 1);
  assert.equal(f.calls.closes, 1);
  assert.deepEqual(f.calls.writes, []);
});
