'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8');

// Deterministic lock scheduling only. The companion browser suite exercises
// the real same-origin Web Lock manager and localStorage in separate pages.
function lockQueue() {
  const tails = new Map();
  return {
    request(name, options, callback) {
      return new Promise((resolve, reject) => {
        let cancelled = false;
        const cancel = () => {
          cancelled = true;
          reject(options.signal.reason);
        };
        options.signal?.addEventListener('abort', cancel, { once: true });
        if (options.signal?.aborted) cancel();
        const predecessor = tails.get(name) || Promise.resolve();
        const next = predecessor
          .catch(() => {})
          .then(async () => {
            options.signal?.removeEventListener('abort', cancel);
            if (cancelled) return;
            try {
              resolve(await callback({ name, mode: 'exclusive' }));
            } catch (error) {
              reject(error);
            }
          });
        tails.set(name, next);
      });
    },
  };
}
function context({ items = new Map(), locks = lockQueue(), timer = setTimeout } = {}) {
  const localStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    key: (index) => [...items.keys()][index] ?? null,
    get length() {
      return items.size;
    },
  };
  const root = {
    AlibiCore: { clone: structuredClone },
    localStorage,
    navigator: { locks },
    AbortController,
    setTimeout: timer,
    clearTimeout,
  };
  vm.runInNewContext(source, root);
  const store = new root.AlibiStorage.Store();
  store.mode = 'local';
  return { store, items, localStorage, root };
}
const run = (note = 'first', key = 'scene-01@1') => ({ key, rev: 0, schemaVersion: 1, note });
async function oneWinner(first, second) {
  const results = await Promise.allSettled([
    first.saveRun(run('A'), 0),
    second.saveRun(run('B'), 0),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
  const winner = results.find((r) => r.status === 'fulfilled').value;
  assert.equal(results.find((r) => r.status === 'rejected').reason.name, 'ConflictError');
  assert.equal(winner.rev, 1);
  assert.equal(JSON.stringify(await first.get('runs', winner.key)), JSON.stringify(winner));
  return winner;
}

test('session same-turn writes have one winner, not two revision-one successes', async () => {
  const { store } = context();
  store.mode = 'session';
  await oneWinner(store, store);
});
test('local same-instance writes have one winner', async () => {
  const { store } = context();
  await oneWinner(store, store);
});
test('two independent instances sharing local storage and a lock manager have one winner', async () => {
  const items = new Map(),
    locks = lockQueue();
  const a = context({ items, locks }),
    b = context({ items, locks });
  const winner = await oneWinner(a.store, b.store);
  assert.equal(JSON.stringify(await b.store.get('runs', winner.key)), JSON.stringify(winner));
});
test('different keys may save without a false revision conflict', async () => {
  const { store } = context();
  const results = await Promise.all([
    store.saveRun(run('A', 'a@1'), 0),
    store.saveRun(run('B', 'b@1'), 0),
  ]);
  assert.deepEqual(
    results.map((r) => r.rev),
    [1, 1],
  );
});
test('caller mutation during lock acquisition cannot change the key or payload', async () => {
  const { store } = context();
  const record = run();
  const pending = store.saveRun(record, 0);
  record.key = 'other@1';
  record.note = 'changed';
  const saved = await pending;
  assert.equal(saved.key, 'scene-01@1');
  assert.equal(saved.note, 'first');
  assert.equal(await store.get('runs', 'other@1'), undefined);
});
for (const locks of [null, {}, { request: null }]) {
  test(`unavailable lock support refuses writes while keeping export available: ${JSON.stringify(locks)}`, async () => {
    const { store, items } = context({ locks });
    const original = JSON.stringify({ ...run(), rev: 1 });
    items.set('alibi.v1.runs.scene-01@1', original);
    await assert.rejects(store.saveRun(run('replacement'), 1), /safe.*sav|locking|safely/i);
    assert.equal(items.get('alibi.v1.runs.scene-01@1'), original);
    assert.equal((await store.export()).runs[0].note, 'first');
  });
}
test('a denied lock request does not fall through to an unlocked write', async () => {
  const denied = Object.assign(Error('denied'), { name: 'SecurityError' });
  const { store, items } = context({ locks: { request: () => Promise.reject(denied) } });
  await assert.rejects(store.saveRun(run(), 0), (error) => error === denied);
  assert.equal(items.size, 0);
});
test('lock acquisition timeout cancels the queued write and leaves the winner intact', async () => {
  const locks = lockQueue();
  let release;
  const held = locks.request(
    'alibi.v1.runs.scene-01@1',
    {},
    () => new Promise((r) => (release = r)),
  );
  await new Promise(setImmediate);
  const { store, items } = context({
    locks,
    timer: (callback, ms) => {
      assert.equal(ms, 8000, 'the production acquisition deadline is unchanged');
      return setTimeout(callback, 5);
    },
  });
  const original = JSON.stringify({ ...run(), rev: 1 });
  items.set('alibi.v1.runs.scene-01@1', original);
  try {
    await assert.rejects(store.saveRun(run('late'), 1), /timed out/i);
  } finally {
    release();
    await held;
  }
  await new Promise(setImmediate);
  assert.equal(items.get('alibi.v1.runs.scene-01@1'), original);
});
test('quota failure releases the lock without changing old bytes or input', async () => {
  const { store, items, localStorage } = context();
  const record = run();
  await store.saveRun(record, 0);
  const original = items.get('alibi.v1.runs.scene-01@1');
  const set = localStorage.setItem;
  const quota = Object.assign(Error('quota'), { name: 'QuotaExceededError' });
  localStorage.setItem = () => {
    throw quota;
  };
  await assert.rejects(store.saveRun(record, 1), (error) => error === quota);
  assert.equal(items.get('alibi.v1.runs.scene-01@1'), original);
  assert.equal(record.rev, 0);
  localStorage.setItem = set;
  assert.equal((await store.saveRun(record, 1)).rev, 2);
});
for (const raw of [
  '{bad',
  '',
  'null',
  'false',
  JSON.stringify({ ...run(), schemaVersion: 2 }),
  JSON.stringify({ ...run(), rev: '0' }),
]) {
  test(`unsupported existing local bytes cannot be overwritten: ${raw || 'empty string'}`, async () => {
    const { store, items } = context();
    items.set('alibi.v1.runs.scene-01@1', raw);
    await assert.rejects(store.saveRun(run(), 0), /damaged|unsupported|version/i);
    assert.equal(items.get('alibi.v1.runs.scene-01@1'), raw);
  });
}
