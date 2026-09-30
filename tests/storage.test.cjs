/* Persistence fallback contracts in a Node VM, plus a minimal synchronous
   IndexedDB fixture for the restore shape guard. Not a real browser
   IndexedDB durability, service worker, or cross-tab test. */
'use strict';
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  path = require('node:path');
let assertions = 0;
const ok = (v, m) => {
  assert.ok(v, m);
  assertions++;
};
function setup(local = true, newer = false) {
  const items = new Map(),
    ls = {
      setItem(k, v) {
        if (!local) throw Error('Storage denied');
        items.set(k, String(v));
      },
      removeItem(k) {
        items.delete(k);
      },
      getItem: (k) => items.get(k) ?? null,
      key: (i) => [...items.keys()][i] ?? null,
      get length() {
        return items.size;
      },
    };
  const ctx = {
    structuredClone,
    Date,
    console,
    localStorage: ls,
    setTimeout,
    clearTimeout,
    Event: class Event {},
    dispatchEvent() {},
  };
  if (newer)
    ctx.indexedDB = {
      open() {
        const r = {};
        setTimeout(() => {
          r.error = Object.assign(Error('Newer database'), { name: 'VersionError' });
          r.onerror();
        }, 0);
        return r;
      },
    };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8'), ctx);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../src/discovery-storage.js'), 'utf8'),
    ctx,
  );
  return {
    Store: ctx.AlibiStorage.Store,
    compareAndSwapMeta: ctx.AlibiDiscoveryStorage.compareAndSwapMeta,
    items,
    ls,
  };
}
function restoreFixture(seed) {
  const disk = {
    runs: new Map(Object.entries(seed.runs)),
    packs: new Map(),
    meta: new Map(),
  };
  let aborted = false;
  const request = (result) => {
    const pending = { result, onsuccess: null, onerror: null };
    setTimeout(() => {
      if (!aborted && pending.onsuccess) pending.onsuccess();
    }, 0);
    return pending;
  };
  const tx = {
    oncomplete: null,
    onerror: null,
    onabort: null,
    listeners: { complete: [], error: [], abort: [] },
    addEventListener(ev, fn) {
      this.listeners[ev].push(fn);
    },
    abort() {
      aborted = true;
      setTimeout(() => {
        for (const f of this.listeners.abort)
          try {
            f();
          } catch {}
        if (this.onabort) this.onabort();
      }, 0);
    },
    objectStore(name) {
      const table = disk[name];
      return {
        get(key) {
          return request(
            table.has(key) ? { key, value: structuredClone(table.get(key)) } : undefined,
          );
        },
        getAll() {
          return request(
            [...table.entries()].map(([key, value]) => ({
              key,
              value: structuredClone(value),
            })),
          );
        },
        put(entry) {
          table.set(entry.key, structuredClone(entry.value));
        },
        clear() {
          table.clear();
        },
      };
    },
  };
  return {
    disk,
    db: {
      transaction() {
        setTimeout(() => {
          if (aborted) return;
          for (const f of tx.listeners.complete)
            try {
              f();
            } catch {}
          if (tx.oncomplete) tx.oncomplete();
        }, 20);
        return tx;
      },
    },
  };
}
(async () => {
  for (const local of [true, false]) {
    const { Store, compareAndSwapMeta, items, ls } = setup(local),
      s = await new Store().init();
    ok(s.mode === (local ? 'local' : 'session'), 'honest ' + s.mode + ' mode');
    const r = { key: 'scene-01@1', rev: 0, state: { placements: {} }, schemaVersion: 1 };
    const one = await s.saveRun(r, 0);
    ok(one.rev === 1, 'revision increment');
    ok(r.rev === 0, 'save does not mutate caller');
    ok((await s.get('runs', r.key)).rev === 1, 'saved record retrievable');
    await assert.rejects(s.saveRun(r, 0), (e) => e.name === 'ConflictError');
    assertions++;
    ok((await s.get('runs', r.key)).rev === 1, 'stale write did not replace save');
    const capture = {
      key: 'scene-01@1',
      rev: 1,
      state: { placements: {} },
      schemaVersion: 1,
    };
    const capturedSave = s.saveRun(capture, 1);
    capture.key = 'scene-02@1';
    ok((await capturedSave).rev === 2, 'key-captured save increments revision');
    ok((await s.get('runs', 'scene-01@1')).rev === 2, 'write landed under the original key');
    ok((await s.get('runs', 'scene-02@1')) === undefined, 'mutated key was not written');
    await s.put('meta', 'preferences', { seen: ['scene'], favorites: ['scene-01'] });
    await s.put('packs', 'example-pack', { revision: 1 });
    if (local) {
      ok(items.has('alibi.v1.runs.scene-01@1'), 'run fallback keeps its prefixed key');
      ok(items.has('alibi.v1.meta.preferences'), 'meta fallback keeps its prefixed key');
      ok(items.has('alibi.v1.packs.example-pack'), 'pack fallback keeps its prefixed key');
      ok(!items.has('alibi.v1.probe'), 'fallback probe is not retained as save data');
      ok(
        [...items.keys()].sort().join('|') ===
          ['alibi.v1.meta.preferences', 'alibi.v1.packs.example-pack', 'alibi.v1.runs.scene-01@1']
            .sort()
            .join('|'),
        'cabinet fallback key set matches the documented inventory',
      );
    }
    const entitlementState = {
      schema: 1,
      generation: 1,
      receipts: [],
      owned: [],
      outbox: [],
    };
    await assert.rejects(
      compareAndSwapMeta(s, 'discovery-entitlements', -1, entitlementState),
      /generation/i,
    );
    assertions++;
    await assert.rejects(
      compareAndSwapMeta(s, 'discovery-entitlements', 0, {
        ...entitlementState,
        generation: 2,
      }),
      /next generation/i,
    );
    assertions++;
    await assert.rejects(
      compareAndSwapMeta(s, 'discovery-entitlements', 0, entitlementState),
      /requires IndexedDB/,
    );
    assertions++;
    ok(
      (await s.get('meta', 'discovery-entitlements')) === undefined,
      'nontransactional fallback refuses central CAS without creating state',
    );
    const backup = await s.export();
    ok(backup.format === 'alibi-backup' && backup.schemaVersion === 1, 'stable backup envelope');
    ok(backup.preferences.seen[0] === 'scene', 'preferences exported');
    await assert.rejects(s.restore({ ...backup, runs: [] }), /requires IndexedDB/);
    assertions++;
    ok(
      (await s.getAll('runs')).length === 1,
      'nontransactional restore refused without clearing data',
    );
    const again = await new Store().init();
    ok(
      (await again.getAll('runs')).length === (local ? 1 : 0),
      local ? 'local fallback visible to fresh store' : 'session fallback correctly ephemeral',
    );
    if (local) {
      // Loud report plus preserved bytes is the contract (see the origin
      // suite's malformed-persisted cases): damage must surface, and the
      // message points at browser-level data export, not in-app recovery.
      ls.setItem('alibi.v1.runs.bad', '{bad');
      await assert.rejects(s.getAll('runs'), /A saved record is damaged/);
      assertions++;
      ok(items.has('alibi.v1.runs.bad'), 'corrupt record not deleted');
      await assert.rejects(s.get('runs', 'bad'), /damaged/);
      assertions++;
      ok(items.has('alibi.v1.runs.bad'), 'corrupt single read preserves the record');
      ls.removeItem('alibi.v1.runs.bad');
      const realKey = ls.key;
      ls.key = (i) => (i === 1 ? null : realKey(i));
      ok((await s.getAll('runs')).length === 1, 'null storage key skipped without crashing');
      ls.key = realKey;
    }
  }
  {
    const { Store: GuardedStore } = setup(true),
      target = await new GuardedStore().init(),
      keyless = restoreFixture({
        runs: { 'scene-01@1': { key: 'scene-01@1', rev: 1 } },
      });
    target.db = keyless.db;
    const before = JSON.stringify([...keyless.disk.runs.entries()]);
    await assert.rejects(
      target.restore({ runs: [{ rev: 1 }], packs: [] }),
      /Unsupported backup format/,
    );
    assertions++;
    ok(
      JSON.stringify([...keyless.disk.runs.entries()]) === before,
      'rejected restore left the prior run byte-identical',
    );
    const valid = restoreFixture({
      runs: { 'scene-01@1': { key: 'scene-01@1', rev: 1 } },
    });
    target.db = valid.db;
    await target.restore({
      format: 'alibi-backup',
      schemaVersion: 1,
      runs: [{ key: 'scene-01@1', rev: 2 }],
      packs: [{ id: 'example-pack' }],
      settings: {},
      preferences: {},
    });
    ok(valid.disk.runs.get('scene-01@1').rev === 2, 'well-formed restore still replaces runs');
    ok(valid.disk.packs.has('example-pack'), 'well-formed restore still replaces packs');
  }
  const { Store } = setup(true, true),
    s = await new Store().init();
  ok(s.fatal, 'newer IndexedDB is a fatal compatibility condition');
  ok(s.mode === 'session' && !s.db, 'newer database does not fall back to competing local saves');
  ok(s.problem.includes('has not been modified'), 'version conflict is explained');
  fs.writeFileSync(
    path.join(__dirname, 'storage-results.json'),
    JSON.stringify(
      {
        passed: true,
        assertions,
        scope:
          'Node VM: exact cabinet fallback keys, session/local fallback, sequential revision conflict, saveRun key capture, lazy metadata CAS fallback refusal, export, damaged-record loud report with byte preservation, single-read corruption message, null-key iteration, restore shape guard with byte-identical refusal, destructive-restore refusal and newer-database refusal. Not real browser IndexedDB durability or reload testing.',
      },
      null,
      2,
    ),
  );
  console.log('PASS', assertions, 'storage contract assertions');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
