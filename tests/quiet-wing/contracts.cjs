'use strict';
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const E = require('../../src/quiet-wing/engine.js'),
  code = fs.readFileSync(require.resolve('../../src/quiet-wing/storage.js'), 'utf8');
let checks = 0;
const ok = (b, msg) => {
  assert.ok(b, msg);
  checks++;
};
function local() {
  const m = new Map();
  return {
    m,
    getItem: (k) => m.get(k) || null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
function env(storage, indexedDB) {
  let statuses = [];
  const c = {
    console,
    Promise,
    Date,
    Error,
    JSON,
    Map,
    structuredClone,
    setTimeout: (f, ms) => setTimeout(f, ms === 2200 ? 40 : ms),
    clearTimeout,
    QWEngine: E,
    localStorage: storage,
    indexedDB,
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(code, c);
  // This storage-only fixture supplies the browser worker's validated result.
  c.AlibiValidateImport = async (m) => c.QWStore.validate(m.value);
  c.QWStore.status((text, status) => statuses.push({ text, status }));
  return { s: c.QWStore, statuses };
}
function fakeIDB() {
  const data = new Map();
  let chain = Promise.resolve(),
    hang = false,
    aborts = 0;
  const db = {
    objectStoreNames: { contains: () => true },
    close() {},
    transaction(name, kind) {
      const tx = {
        error: null,
        abort() {
          if (tx.done) return;
          tx.done = true;
          aborts++;
          tx.onabort?.();
        },
        objectStore() {
          return {
            get(key) {
              const req = {};
              tx.reads.push([key, req]);
              return req;
            },
            put(v, k) {
              tx.writes.push([k, structuredClone(v)]);
              return {};
            },
          };
        },
        reads: [],
        writes: [],
      };
      chain = chain.then(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              if (tx.done) {
                resolve();
                return;
              }
              for (const [key, req] of tx.reads) {
                req.result = structuredClone(data.get(key));
                req.onsuccess?.({ target: req });
              }
              if (tx.done) {
                resolve();
                return;
              }
              if (hang) {
                setTimeout(resolve, 60);
                return;
              }
              if (kind === 'readwrite') for (const [key, value] of tx.writes) data.set(key, value);
              tx.done = true;
              tx.oncomplete?.();
              resolve();
            }, 0),
          ),
      );
      return tx;
    },
  };
  return {
    data,
    db,
    api: {
      open() {
        const req = {};
        setTimeout(() => {
          req.result = db;
          req.onsuccess?.();
        }, 0);
        return req;
      },
    },
    setHang: (v) => (hang = v),
    getAborts: () => aborts,
  };
}
(async () => {
  const stalledFallback = local();
  const stalled = env(stalledFallback, {open() { return {}; }});
  const stalledResult = await stalled.s.open();
  ok(stalledResult.blocked && stalledResult.mode === 'protected', 'An ambiguous open timeout stays protected instead of forking a fallback save');
  await assert.rejects(stalled.s.write(E.newState(Date.now())), /./);
  ok(stalledFallback.m.size === 0, 'Timed-out open creates no fallback edits');
  const ls = local(),
    a = env(ls),
    r = await a.s.open();
  ok(r.mode === 'local', 'Fallback explicitly local');
  const x = E.newState(Date.now());
  await a.s.write(x);
  ok(a.s.info().revision === 1, 'Revision increment');
  const b = env(ls);
  const rb = await b.s.open();
  ok(rb.saved.scene.name === x.scene.name, 'Fallback reload');
  x.scene.name = 'Latest';
  await a.s.write(x);
  let failed = false;
  try {
    await b.s.write(rb.saved);
  } catch {
    failed = true;
  }
  ok(failed && b.s.info().blocked, 'Stale fallback refuses write');
  ok(
    JSON.parse(ls.getItem('alibi-quiet-wing-v1:fallback')).scene.name === 'Latest',
    'Conflict kept newer value',
  );
  const c = env(ls);
  await c.s.open();
  await assert.rejects(c.s.replace(E.newState(Date.now())), /Restore requires IndexedDB/);
  ok(
    JSON.parse(ls.getItem('alibi-quiet-wing-v1:fallback')).scene.name === 'Latest',
    'Fallback restore refused without changing data',
  );
  const malformed = local();
  malformed.setItem('alibi-quiet-wing-v1:fallback', '{"schema":999}');
  const d = env(malformed);
  ok((await d.s.open()).blocked, 'Future format is protected');
  ok(
    malformed.getItem('alibi-quiet-wing-v1:fallback') === '{"schema":999}',
    'Future bytes untouched',
  );
  const session = env({
    setItem() {
      throw Error('denied');
    },
  });
  ok((await session.s.open()).mode === 'session', 'Denied storage enters session only');
  await session.s.write(E.newState(Date.now()));
  ok(session.statuses.at(-1).status === 'warning', 'Session warning');
  const fake = fakeIDB(),
    u = env(local(), fake.api),
    v = env(local(), fake.api);
  await u.s.open();
  await v.s.open();
  await u.s.write(x);
  ok(fake.data.get('state').revision === 1, 'Actual adapter writes through simulated transaction');
  try {
    await v.s.write(E.newState(Date.now()));
  } catch {}
  ok(v.s.info().blocked, 'Transactional CAS blocks stale tab');
  ok(fake.data.get('state').scene.name === 'Latest', 'CAS preserves latest');
  const w = env(local(), fake.api);
  await w.s.open();
  const repl = E.newState(Date.now());
  repl.scene.name = 'Replacement';
  await w.s.replace(repl);
  ok(
    fake.data.get('recovery').state.scene.name === 'Latest',
    'Recovery is previous committed state',
  );
  ok(
    fake.data.get('state').scene.name === 'Replacement',
    'Restore and recovery commit together in fixture',
  );
  for (const invalid of ['constructor', '__proto__', 'toString']) {
    const badPot = E.newState(Date.now());
    badPot.garden.pots[0] = { seed: invalid, plantedAt: Date.now() };
    await assert.rejects(w.s.replace(badPot), /Invalid seed/);
    const badBouquet = E.newState(Date.now());
    badBouquet.garden.bouquet[0] = invalid;
    await assert.rejects(w.s.replace(badBouquet), /Invalid pressed-flower arrangement/);
  }
  ok(
    fake.data.get('recovery').state.scene.name === 'Latest',
    'Rejected garden restores preserve the recovery copy',
  );
  ok(
    fake.data.get('state').scene.name === 'Replacement',
    'Rejected garden restores preserve the current save',
  );
  fake.setHang(true);
  try {
    await w.s.write(x);
  } catch {}
  ok(fake.getAborts() >= 2, 'Timed-out transaction is aborted');
  ok(w.s.info().blocked, 'Timed-out writer becomes read-only');
  ok(
    fake.data.get('state').scene.name === 'Replacement',
    'Timed-out transaction did not write late',
  );
  const rawFuture = await d.s.raw();
  ok(rawFuture.fallback === '{"schema":999}', 'Raw recovery preserves unknown bytes');
  const futureFields = E.newState(Date.now());
  futureFields.futureActivity = { turns: 2 };
  assert.throws(() => c.s.validate(futureFields), /Unknown save fields/);
  checks++;
  const out = {
    passed: true,
    assertions: checks,
    scope:
      'Adapter exercised with localStorage and transactional IndexedDB fixtures, including conflicts, protected fields, raw fallback recovery, restore and timeout/abort. Not actual browser persistence or service-worker lifecycle.',
  };
  fs.writeFileSync(
    require('node:path').join(__dirname, 'contract-results.json'),
    JSON.stringify(out, null, 2),
  );
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
