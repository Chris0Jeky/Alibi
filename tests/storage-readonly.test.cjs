'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8');
const PREFIX = 'alibi.v1.';
const plain = (value) => JSON.parse(JSON.stringify(value));
const record = (key = 'synthetic@1', note = 'old') => ({
  key,
  note,
  rev: 1,
  schemaVersion: 1,
  state: { placements: {} },
});
function context({ items = new Map(), denied = false, locks } = {}) {
  const writes = [];
  const localStorage = {
    getItem(key) {
      return items.get(key) ?? null;
    },
    setItem(key, value) {
      if (denied) throw Error('Storage denied');
      writes.push([key, String(value)]);
      items.set(key, String(value));
    },
    removeItem(key) {
      items.delete(key);
    },
    key(index) {
      return [...items.keys()][index] ?? null;
    },
    get length() {
      return items.size;
    },
  };
  const root = {
    structuredClone,
    Date,
    setTimeout,
    clearTimeout,
    localStorage,
    navigator: { locks },
    AbortController,
    Event,
    dispatchEvent() {},
  };
  vm.createContext(root);
  vm.runInContext(core, root);
  vm.runInContext(source, root);
  return { Store: root.AlibiStorage.Store, items, writes, root };
}
async function local(options) {
  const f = context(options);
  const store = await new f.Store().init();
  assert.equal(store.mode, 'local');
  f.writes.length = 0;
  return { ...f, store };
}
for (const raw of [
  undefined,
  JSON.stringify(record()),
  '',
  '{bad',
  'null',
  JSON.stringify({ ...record(), schemaVersion: 9 }),
  JSON.stringify({ ...record(), rev: Number.MAX_SAFE_INTEGER }),
]) {
  test(`local refusal preserves ${JSON.stringify(raw)}`, async () => {
    const items = new Map();
    if (raw !== undefined) items.set(PREFIX + 'runs.synthetic@1', raw);
    const f = await local({ items });
    const input = record('synthetic@1', 'unsaved session edit');
    const before = structuredClone(input);
    await assert.rejects(
      f.store.saveRun(input, raw === undefined ? 0 : 1),
      /read-only.*IndexedDB/i,
    );
    assert.deepEqual(input, before, 'caller state must remain available for export');
    assert.equal(items.get(PREFIX + 'runs.synthetic@1'), raw, 'raw bytes must not change');
    assert.deepEqual(f.writes, [], 'no run write may be attempted');
  });
}
test('native-lock availability cannot re-enable nontransactional local run writes', async () => {
  let requests = 0;
  const f = await local({
    locks: {
      request: async (_key, _options, fn) => {
        requests++;
        return fn();
      },
    },
  });
  await assert.rejects(f.store.saveRun(record(), 0), /read-only/i);
  assert.equal(requests, 0);
  assert.deepEqual(f.writes, []);
});
test('two independent stores sharing local records both refuse overlapping saves', async () => {
  const items = new Map([[PREFIX + 'runs.synthetic@1', JSON.stringify(record())]]);
  const a = await local({ items });
  const b = await local({ items });
  const before = [...items];
  const outcomes = await Promise.allSettled([
    a.store.saveRun(record('synthetic@1', 'A'), 1),
    b.store.saveRun(record('synthetic@1', 'B'), 1),
  ]);
  assert.equal(
    outcomes.filter((r) => r.status === 'rejected' && /read-only/i.test(r.reason.message)).length,
    2,
  );
  assert.deepEqual([...items], before);
  assert.deepEqual(a.writes.concat(b.writes), []);
});
test('local put protects runs but leaves settings and packs unchanged', async () => {
  const f = await local();
  await assert.rejects(f.store.put('runs', 'synthetic@1', record()), /read-only/i);
  await f.store.put('meta', 'settings', { contrast: true });
  await f.store.put('packs', 'synthetic', { id: 'synthetic', version: 1 });
  assert.equal(f.writes.length, 2);
  assert.equal(await f.store.get('runs', 'synthetic@1'), undefined);
  assert.deepEqual(plain(await f.store.get('meta', 'settings')), { contrast: true });
});
test('local export preserves valid/future records and reports malformed bytes', async () => {
  const valid = record();
  const future = { ...record('future@9'), schemaVersion: 9 };
  const items = new Map([
    [PREFIX + 'runs.synthetic@1', JSON.stringify(valid)],
    [PREFIX + 'runs.future@9', JSON.stringify(future)],
    [PREFIX + 'runs.damaged', '{bad'],
    [PREFIX + 'runs.empty', ''],
  ]);
  const f = await local({ items });
  const before = [...items];
  assert.deepEqual(plain(await f.store.get('runs', valid.key)), valid);
  assert.deepEqual(plain(await f.store.get('runs', future.key)), future);
  await assert.rejects(f.store.get('runs', 'empty'), /damaged/i);
  const backup = plain(await f.store.export());
  assert.deepEqual(backup.runs, [valid, future]);
  assert.deepEqual(backup.damaged.runs, ['damaged', 'empty']);
  assert.deepEqual([...items], before);
  assert.deepEqual(f.writes, []);
});
test('session compare-and-write has exactly one winner without a yield', async () => {
  const f = context({ denied: true });
  const store = await new f.Store().init();
  assert.equal(store.mode, 'session');
  const input = { ...record(), rev: 0 };
  const outcomes = await Promise.allSettled([store.saveRun(input, 0), store.saveRun(input, 0)]);
  assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find((r) => r.status === 'rejected').reason.name, 'ConflictError');
  assert.equal((await store.get('runs', input.key)).rev, 1);
  assert.equal(input.rev, 0);
  const another = await new f.Store().init();
  assert.equal((await another.getAll('runs')).length, 0, 'separate sessions do not share storage');
});
for (const old of [
  null,
  { ...record(), schemaVersion: 2 },
  { ...record(), rev: -1 },
  { ...record(), rev: 0.5 },
  { ...record(), key: 'different@1' },
]) {
  test(`unknown session record is preserved: ${JSON.stringify(old)}`, async () => {
    const f = context({ denied: true });
    const store = await new f.Store().init();
    await store.put('runs', 'synthetic@1', old);
    const before = plain(await store.export());
    await assert.rejects(
      store.saveRun(record(), old?.rev >= 0 && Number.isInteger(old.rev) ? old.rev : 0),
      /damaged|unsupported/i,
    );
    assert.deepEqual(plain(await store.get('runs', 'synthetic@1')), old);
    assert.deepEqual(plain((await store.export()).runs), before.runs);
  });
}
test('IndexedDB takes precedence over fallback mode for generic writes', async () => {
  const f = await local();
  let writes = 0;
  const tx = {
    addEventListener() {},
    objectStore() {
      return {
        put() {
          writes++;
          queueMicrotask(() => tx.oncomplete());
        },
      };
    },
  };
  f.store.db = {
    transaction() {
      return tx;
    },
  };
  f.store.watch = () => {};
  const input = record();
  assert.equal(await f.store.put('runs', input.key, input), input);
  assert.equal(writes, 1);
  assert.deepEqual(f.writes, []);
});
