'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../src/origin-transfer.js'), 'utf8');

function fixture(options = {}) {
  const timers = new Map();
  let nextTimer = 0,
    closed = 0,
    aborted = 0,
    transaction,
    request;
  const context = {
    setTimeout(fn) {
      timers.set(++nextTimer, fn);
      return nextTimer;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    indexedDB: {
      open(name, version) {
        assert.equal(name, 'alibi-origin-recovery');
        assert.equal(version, undefined, 'a read must not request an upgrade');
        request = {};
        if (options.throwOpen) throw options.throwOpen;
        return request;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const db = {
    version: options.version || 1,
    objectStoreNames: { contains: (name) => name === 'copies' && !options.noStore },
    close: () => closed++,
    transaction(name, mode) {
      assert.equal(name, 'copies');
      assert.equal(mode, 'readonly');
      const count = {},
        value = {};
      transaction = {
        abort: () => aborted++,
        objectStore: () => ({
          count(key) {
            assert.equal(key, 'pending');
            return count;
          },
          get(key) {
            assert.equal(key, 'pending');
            return value;
          },
        }),
      };
      transaction.commit = (present, pending) => {
        count.result = present ? 1 : 0;
        value.result = pending;
        transaction.oncomplete();
      };
      return transaction;
    },
  };
  return {
    api: context.AlibiOriginTransfer,
    context,
    success() {
      request.result = db;
      request.onsuccess();
    },
    missing() {
      request.transaction = { abort: () => aborted++ };
      request.onupgradeneeded();
      request.error = Error('Aborted initial database creation');
      request.onerror();
    },
    timeout() {
      for (const fn of [...timers.values()]) fn();
    },
    request: () => request,
    transaction: () => transaction,
    closed: () => closed,
    aborted: () => aborted,
    timers: () => timers.size,
  };
}

test('startup inspection leaves an absent recovery database absent', async () => {
  const f = fixture();
  const result = f.api.inspectPendingRecovery();
  f.missing();
  assert.equal((await result).present, false);
  assert.equal(f.aborted(), 1);
  assert.equal(f.timers(), 0);
});

test('empty existing recovery store permits normal startup and closes its read handle', async () => {
  const f = fixture();
  const result = f.api.inspectPendingRecovery();
  f.success();
  f.transaction().commit(false);
  assert.equal((await result).present, false);
  assert.equal(f.closed(), 1);
  assert.equal(f.timers(), 0);
});

test('present falsy and unknown copies are detected by key presence without rewriting', async () => {
  for (const value of [undefined, null, false, 0, '', { future: 7 }]) {
    const f = fixture();
    const result = f.api.inspectPendingRecovery();
    f.success();
    f.transaction().commit(true, value);
    const read = await result;
    assert.equal(read.present, true);
    assert.equal(read.value, value);
    assert.equal(f.closed(), 1);
    assert.equal(f.aborted(), 0);
  }
});

test('definitely unavailable IndexedDB preserves the established fallback startup', async () => {
  const f = fixture();
  f.context.indexedDB = undefined;
  assert.equal((await f.api.inspectPendingRecovery()).present, false);
  assert.equal(f.request(), undefined);
});

test('blocked, denied, failed and unrecognized recovery storage cannot look absent', async () => {
  for (const type of ['blocked', 'error', 'denied', 'future', 'missing-store']) {
    const f = fixture({
      version: type === 'future' ? 2 : 1,
      noStore: type === 'missing-store',
      throwOpen:
        type === 'denied' ? Object.assign(Error('denied'), { name: 'SecurityError' }) : null,
    });
    const result = f.api.inspectPendingRecovery();
    if (type === 'blocked') f.request().onblocked();
    if (type === 'error') {
      f.request().error = Error('open failed');
      f.request().onerror();
    }
    if (type === 'future' || type === 'missing-store') f.success();
    await assert.rejects(result);
    assert.equal(f.timers(), 0);
  }
});

test('a stalled open rejects, closes late success and aborts a late creation', async () => {
  for (const late of ['success', 'creation']) {
    const f = fixture();
    const result = f.api.inspectPendingRecovery();
    f.timeout();
    await assert.rejects(result, /timed out/i);
    if (late === 'success') {
      f.success();
      assert.equal(f.closed(), 1);
      assert.equal(f.transaction(), undefined);
    } else {
      f.missing();
      assert.equal(f.aborted(), 1);
    }
  }
});

test('read deadline aborts the readonly transaction and cannot later report clean startup', async () => {
  const f = fixture();
  const result = f.api.inspectPendingRecovery();
  f.success();
  f.timeout();
  await assert.rejects(result, /timed out/i);
  assert.equal(f.aborted(), 1);
  assert.equal(f.closed(), 1);
  f.transaction().commit(false);
});

test('aborted recovery reads and version changes remain protective failures', async () => {
  for (const reason of ['abort', 'version']) {
    const f = fixture();
    const result = f.api.inspectPendingRecovery();
    f.success();
    if (reason === 'abort') f.transaction().onabort();
    else f.request().result.onversionchange();
    await assert.rejects(result);
    assert.equal(f.closed(), 1);
  }
});

test('recovery export preserves unknown JSON fields and names its limited format', () => {
  const f = fixture();
  const value = vm.runInContext(
    '({ cabinet: { note: "private ☂" }, future: [null, false, 0] })',
    f.context,
  );
  const text = f.api.recoveryJson(value);
  assert.deepEqual(JSON.parse(text), {
    format: 'alibi-origin-recovery-export',
    version: 1,
    pending: { cabinet: { note: 'private ☂' }, future: [null, false, 0] },
  });
});

test('recovery export refuses values JSON would lose or transform without mutating them', () => {
  const f = fixture();
  for (const expression of [
    'undefined',
    'NaN',
    'Infinity',
    '-0',
    '1n',
    'new Date(0)',
    'new Map([["a", 1]])',
    '({ a: undefined })',
    '[, 1]',
    'Object.assign([1], { note: "keep" })',
    '(() => { const x = {}; x.self = x; return x; })()',
    '({ toJSON() { return "lost"; }, retained: true })',
  ]) {
    const value = vm.runInContext(expression, f.context);
    assert.throws(() => f.api.recoveryJson(value), /JSON|recovery/i, expression);
  }
});

test('actual application startup waits for recovery before initializing its storage owner', async () => {
  const app = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const begin = app.indexOf('  if (await AlibiOriginTransfer.protectStartup(download)) return;');
  const end = app.indexOf('  let settings =', begin);
  assert.ok(begin >= 0 && end > begin);
  for (const held of [true, false]) {
    let release,
      opened = 0;
    const ctx = {
      AlibiOriginTransfer: {
        protectStartup: () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      },
      AlibiStorage: {
        Store: class {
          init() {
            opened++;
          }
        },
      },
      download() {},
    };
    const run = vm.runInNewContext(`(async () => { ${app.slice(begin, end)} })()`, ctx);
    assert.equal(opened, 0, 'ordinary storage must wait for inspection');
    release(held);
    await run;
    assert.equal(opened, held ? 0 : 1);
  }
});
