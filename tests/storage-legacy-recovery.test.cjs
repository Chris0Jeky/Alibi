'use strict';
// Alibi603: older browser data discovery without migration.
// Uses actual src/storage.js + src/core.js in a small VM with a Map
// localStorage fixture (mirrors tests/storage-readonly.test.cjs).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const storageSource = fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const PREFIX = 'alibi.v1.';
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeLocalStorage(items, writes, hooks = {}) {
  return {
    getItem(key) {
      if (hooks.denyRead) throw Error('Storage denied');
      if (hooks.vanishKeys && hooks.vanishKeys.includes(key)) return null;
      return items.get(key) ?? null;
    },
    setItem(key, value) {
      if (hooks.denyWrite) throw Error('Storage denied');
      writes.push([key, String(value)]);
      items.set(key, String(value));
    },
    removeItem(key) {
      writes.push(['remove:' + key, '']);
      items.delete(key);
    },
    key(index) {
      if (hooks.denyKey) throw Error('Storage denied');
      const keys = [...items.keys()];
      if (hooks.nullKeyAt !== undefined && index === hooks.nullKeyAt) return null;
      return keys[index] ?? null;
    },
    get length() {
      if (hooks.denyLength) throw Error('Storage denied');
      return items.size;
    },
  };
}

function fakeDb({ runs = [], packs = [], meta = {} } = {}) {
  const stores = {
    runs: new Map(runs.map((r) => [r.key, { key: r.key, value: r }])),
    packs: new Map(packs.map((p) => [p.key ?? p.id, { key: p.key ?? p.id, value: p }])),
    meta: new Map(Object.entries(meta).map(([k, v]) => [k, { key: k, value: v }])),
  };
  return {
    close() {},
    transaction() {
      const tx = { addEventListener() {} };
      tx.objectStore = (name) => ({
        getAll() {
          const req = {};
          queueMicrotask(() => {
            req.result = [...stores[name].values()];
            req.onsuccess && req.onsuccess();
          });
          return req;
        },
        get(k) {
          const req = {};
          queueMicrotask(() => {
            req.result = stores[name].get(k);
            req.onsuccess && req.onsuccess();
          });
          return req;
        },
      });
      return tx;
    },
  };
}

function context({ items = new Map(), hooks = {}, db = null, openError = null } = {}) {
  const writes = [];
  const localStorage = makeLocalStorage(items, writes, hooks);
  const resolvedDb = db || fakeDb();
  const indexedDB = {
    open() {
      const req = { result: null, error: null, transaction: { abort() {} } };
      queueMicrotask(() => {
        if (openError) {
          req.error = openError;
          req.onerror && req.onerror();
        } else {
          req.result = resolvedDb;
          req.onsuccess && req.onsuccess();
        }
      });
      return req;
    },
  };
  const root = {
    structuredClone,
    Date,
    setTimeout,
    clearTimeout,
    localStorage,
    indexedDB,
    Event,
    dispatchEvent() {},
  };
  vm.createContext(root);
  vm.runInContext(coreSource, root);
  vm.runInContext(storageSource, root);
  return { Store: root.AlibiStorage.Store, items, writes, root };
}

const VALID = { key: 'p1@1', rev: 2, schemaVersion: 1, note: 'kept' };
const FUTURE = { key: 'future@9', rev: 1, schemaVersion: 9, note: 'newer' };

function legacyItems() {
  return new Map([
    [PREFIX + 'runs.p1@1', JSON.stringify(VALID)],
    [PREFIX + 'runs.damaged', '{bad'],
    [PREFIX + 'runs.empty', ''],
    [PREFIX + 'runs.future@9', JSON.stringify(FUTURE)],
    [PREFIX + 'packs.custom', JSON.stringify({ id: 'custom' })],
    [PREFIX + 'meta.settings', '{"theme":"night"}'],
    [PREFIX + 'mystery-unknown', 'raw-bytes'],
    [PREFIX + 'probe', '1'],
    ['other-app-key', 'x'],
    ['alibi.v2.runs.x', 'y'],
  ]);
}

test('successful IDB keeps mode while legacy rows are inventoried exactly', async () => {
  const items = legacyItems();
  const f = context({ items });
  const store = await new f.Store().init();
  assert.equal(store.mode, 'indexeddb');
  assert.equal(store.legacyProblem, null);
  const inv = plain(store.legacyInventory);
  assert.deepEqual(inv, [
    { key: PREFIX + 'runs.p1@1', value: JSON.stringify(VALID) },
    { key: PREFIX + 'runs.damaged', value: '{bad' },
    { key: PREFIX + 'runs.empty', value: '' },
    { key: PREFIX + 'runs.future@9', value: JSON.stringify(FUTURE) },
    { key: PREFIX + 'packs.custom', value: JSON.stringify({ id: 'custom' }) },
    { key: PREFIX + 'meta.settings', value: '{"theme":"night"}' },
    { key: PREFIX + 'mystery-unknown', value: 'raw-bytes' },
  ]);
  assert.deepEqual(f.writes, [], 'inventory must attempt no writes');
  // Re-read returns the same exact raw strings without parsing.
  assert.deepEqual(plain(store.legacySnapshot()), inv);
});

test('newer IDB and colliding legacy rows stay separate; IDB reads authoritative', async () => {
  const idbRun = { key: 'p1@1', rev: 5, schemaVersion: 1, note: 'idb-newer' };
  const items = new Map([[PREFIX + 'runs.p1@1', JSON.stringify(VALID)]]);
  const f = context({ items, db: fakeDb({ runs: [idbRun] }) });
  const store = await new f.Store().init();
  store.watch = () => {};
  assert.equal(store.mode, 'indexeddb');
  assert.deepEqual(plain(await store.getAll('runs')), [idbRun]);
  assert.deepEqual(plain(await store.get('runs', 'p1@1')), idbRun);
  assert.deepEqual(plain((await store.export()).runs), [idbRun]);
  assert.deepEqual(plain(store.legacyInventory), [
    { key: PREFIX + 'runs.p1@1', value: JSON.stringify(VALID) },
  ]);
  assert.notDeepEqual(plain(store.legacyInventory)[0].value, JSON.stringify(idbRun));
});

test('denied enumeration throws and stays distinct without breaking usable IDB', async () => {
  const f = context({ items: legacyItems(), hooks: { denyLength: true } });
  const store = await new f.Store().init();
  assert.throws(() => store.legacySnapshot(), /could not be checked/i);
  assert.equal(store.mode, 'indexeddb');
  assert.deepEqual(plain(store.legacyInventory), []);
  assert.match(store.legacyProblem || '', /could not be checked/i);
  assert.ok(!/timed out|newer version|read-only/i.test(store.legacyProblem));
  store.watch = () => {};
  assert.deepEqual(plain(await store.getAll('runs')), []);
});

test('denied key enumeration throws with usable IDB intact', async () => {
  const f = context({ items: legacyItems(), hooks: { denyKey: true } });
  const store = await new f.Store().init();
  assert.throws(() => store.legacySnapshot(), /could not be checked/i);
  assert.equal(store.mode, 'indexeddb');
  assert.match(store.legacyProblem || '', /could not be checked/i);
});

test('denied localStorage access reports recovery unavailable without breaking IDB', async () => {
  const f = context();
  Object.defineProperty(f.root, 'localStorage', {
    get() {
      throw Error('Storage access denied');
    },
  });
  const store = await new f.Store().init();
  assert.equal(store.mode, 'indexeddb');
  assert.match(store.legacyProblem, /Older browser data could not be checked/);
  assert.throws(() => store.legacySnapshot(), /Older browser data could not be checked/);
  assert.deepEqual(f.writes, []);
});

test('denied value read throws with usable IDB intact', async () => {
  const f = context({ items: legacyItems(), hooks: { denyRead: true } });
  const store = await new f.Store().init();
  assert.throws(() => store.legacySnapshot(), /could not be (checked|read)/i);
  assert.equal(store.mode, 'indexeddb');
  assert.match(store.legacyProblem || '', /could not be/i);
});

test('null key during enumeration throws rather than returning partial recovery', async () => {
  const f = context({ items: legacyItems(), hooks: { nullKeyAt: 0 } });
  const store = await new f.Store().init();
  assert.throws(() => store.legacySnapshot(), /fully read|missing/i);
  assert.equal(store.mode, 'indexeddb');
  assert.deepEqual(plain(store.legacyInventory), []);
  assert.ok(store.legacyProblem);
});

test('vanished prefixed value throws rather than returning partial recovery', async () => {
  const f = context({
    items: legacyItems(),
    hooks: { vanishKeys: [PREFIX + 'runs.p1@1'] },
  });
  const store = await new f.Store().init();
  assert.throws(() => store.legacySnapshot(), /changed while reading/i);
  assert.equal(store.mode, 'indexeddb');
  assert.deepEqual(plain(store.legacyInventory), []);
});

for (const replace of [false, true]) {
  test(`concurrent legacy key ${replace ? 'replacement' : 'addition'} refuses a partial archive`, async () => {
    const f = context({ items: legacyItems() });
    const store = await new f.Store().init();
    const get = f.root.localStorage.getItem.bind(f.root.localStorage);
    let changed = false;
    f.root.localStorage.getItem = (key) => {
      const value = get(key);
      if (!changed) {
        changed = true;
        if (replace) f.items.delete('other-app-key');
        f.items.set(PREFIX + 'added', 'concurrent bytes');
      }
      return value;
    };
    assert.throws(() => store.legacySnapshot(), /changed while reading/);
    assert.equal(store.mode, 'indexeddb');
  });
}

test('blocked open stays fatal with no fallback writes; legacy check still runs', async () => {
  const items = legacyItems();
  const f = context({
    items,
    openError: Object.assign(Error('Close another Alibi tab.'), { name: 'BlockedError' }),
  });
  const store = await new f.Store().init();
  assert.equal(store.fatal, true);
  assert.notEqual(store.mode, 'local');
  assert.deepEqual(f.writes, [], 'fatal blocked must not probe-write fallback');
  assert.equal(store.legacyProblem, null);
  assert.ok(store.legacyInventory.length > 0);
});

test('newer-version open stays fatal with no fallback writes', async () => {
  const f = context({
    items: legacyItems(),
    openError: Object.assign(Error('newer'), { name: 'VersionError' }),
  });
  const store = await new f.Store().init();
  assert.equal(store.fatal, true);
  assert.match(store.problem || '', /newer version/i);
  assert.deepEqual(f.writes, []);
});

test('legacySnapshot performs no conversion, writes, or fallback selection', async () => {
  const start = storageSource.indexOf('legacySnapshot()');
  const end = storageSource.indexOf('async init()', start);
  const body = storageSource.slice(start, end);
  assert.ok(body.includes('localStorage') || body.includes('root.localStorage'));
  assert.ok(!body.includes('JSON.parse'), 'must never parse legacy bytes');
  assert.ok(!body.includes('JSON.stringify'), 'must never convert legacy bytes');
  assert.ok(!body.includes('setItem'), 'must never write');
  assert.ok(!body.includes('removeItem'), 'must never delete');
  assert.ok(!body.includes('this.mode'), 'must never select fallback');
  assert.ok(body.includes('probe'), 'must exclude the probe key');
});

test('app shell warns separately with count plus explicit export-legacy button', () => {
  assert.ok(appSource.includes('Export older browser data'), 'button label');
  assert.ok(appSource.includes('export-legacy'), 'distinct action');
  assert.ok(appSource.includes('legacyBanner()'), 'shell warning hook');
  assert.ok(appSource.includes('banner warn'), 'existing shell warning style');
  assert.ok(/not been migrated/.test(appSource), 'not-migrated wording');
  assert.ok(
    appSource.includes('Try exporting again.'),
    'failed recovery can be retried through the export action',
  );
});

test('app export action re-reads raw bytes and refuses a failed snapshot without downloading', async () => {
  const at = appSource.indexOf('async function exportLegacy()');
  assert.ok(at >= 0, 'exportLegacy helper exists');
  const body = appSource.slice(at, appSource.indexOf('function legacyBanner', at));
  const f = context({ items: legacyItems() });
  const store = await new f.Store().init();
  f.items.set(PREFIX + 'runs.added-after-init', '\u0000new raw bytes');
  const downloads = [],
    notices = [];
  const app = {
    store,
    Date,
    download: (name, data) => downloads.push({ name, data: plain(data) }),
    toast: (message) => notices.push(message),
  };
  vm.createContext(app);
  vm.runInContext(body + '\nglobalThis.runExport = exportLegacy;', app);
  await app.runExport();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].name, 'alibi-legacy-browser-data.json');
  assert.equal(downloads[0].data.format, 'alibi-legacy-browser-data');
  assert.equal(downloads[0].data.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(downloads[0].data.exportedAt)));
  assert.deepEqual(downloads[0].data.entries, plain(store.legacySnapshot()));
  assert.ok(downloads[0].data.entries.some((entry) => entry.value === '\u0000new raw bytes'));
  assert.equal(notices.length, 1);
  assert.deepEqual(f.writes, []);
  Object.defineProperty(f.root.localStorage, 'length', {
    get() {
      throw Error('Storage denied');
    },
  });
  await assert.rejects(app.runExport(), /could not be checked/);
  assert.equal(downloads.length, 1, 'failed snapshot must produce no new archive');
  assert.equal(notices.length, 1, 'failed snapshot must produce no success notice');
  const dispatch = appSource.indexOf("case 'export-legacy'");
  assert.ok(dispatch >= 0, 'explicit action dispatches exportLegacy');
  assert.ok(appSource.slice(dispatch, dispatch + 200).includes('exportLegacy()'));
});
