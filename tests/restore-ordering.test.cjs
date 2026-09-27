'use strict';
// Club restore-ordering regression: stale old-state snapshots must not
// overwrite a confirmed restore. Uses a fake IndexedDB that models the exact
// shared-queue + CAS + recovery contract deterministically with deferred
// transactions so the restore window stays open for an interleaved move.
// Transaction completion waits for pending requests, matching IndexedDB
// auto-commit (a transaction never completes while a request is pending). Puts stay buffered
// in their transaction (visible to its own later reads) and reach the disk only on complete;
// abort discards them.
// Boundary: this is NOT real browser IndexedDB durability, service workers,
// cross-tab storage events, or physical-device timing.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function makeDisk() {
  const disk = new Map();
  const db = {
    onversionchange: null,
    close() {},
    transaction() {
      const listeners = { complete: [], error: [], abort: [] };
      let aborted = false;
      let pending = 0;
      let generation = 0;
      let completed = false;
      const writes = new Map();
      function fireComplete() {
        if (aborted || completed) return;
        if (pending !== 0) return;
        completed = true;
        for (const [key, value] of writes) disk.set(key, value);
        try {
          if (tx.oncomplete) tx.oncomplete();
        } catch {}
        for (const f of listeners.complete) {
          try {
            f();
          } catch {}
        }
      }
      function maybeComplete() {
        if (aborted || completed) return;
        if (pending !== 0) return;
        const seen = generation;
        setTimeout(() => {
          if (aborted || completed) return;
          if (pending !== 0) return;
          if (seen !== generation) return;
          fireComplete();
        }, 30);
      }
      const tx = {
        objectStore() {
          return {
            get(key) {
              pending += 1;
              generation += 1;
              const req = { result: undefined, onsuccess: null, onerror: null };
              setTimeout(() => {
                if (aborted) {
                  pending -= 1;
                  return;
                }
                const raw = writes.has(key) ? writes.get(key) : disk.get(key);
                req.result = raw === undefined ? undefined : JSON.parse(JSON.stringify(raw));
                pending -= 1;
                if (req.onsuccess) req.onsuccess();
                maybeComplete();
              }, 10);
              return req;
            },
            put(value, key) {
              if (aborted || completed) return;
              writes.set(key, JSON.parse(JSON.stringify(value)));
            },
          };
        },
        addEventListener(ev, fn) {
          if (listeners[ev]) listeners[ev].push(fn);
        },
        abort() {
          if (completed) return;
          aborted = true;
          writes.clear();
          setTimeout(() => {
            try {
              if (tx.onabort) tx.onabort();
            } catch {}
            for (const f of listeners.abort) {
              try {
                f();
              } catch {}
            }
          }, 0);
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
      maybeComplete();
      return tx;
    },
  };
  const indexedDB = {
    open() {
      const req = {
        result: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      setTimeout(() => {
        if (req.onupgradeneeded) {
          req.result = {
            createObjectStore() {},
            transaction: { abort() {} },
          };
          try {
            req.onupgradeneeded();
          } catch {}
        }
        req.result = db;
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    },
  };
  return { disk, indexedDB };
}

async function tabWithDisk(disk, indexedDB) {
  const dialogStub = { close() {} };
  const c = {
    console,
    URL,
    URLSearchParams,
    Math,
    Date,
    JSON,
    Number,
    Promise,
    setTimeout,
    clearTimeout,
    indexedDB,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    location: { hash: '', href: 'http://localhost/', protocol: 'http:' },
    document: {
      addEventListener() {},
      createElement() {
        return {};
      },
      body: { append() {} },
      head: { append() {} },
      getElementById: () => dialogStub,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
  };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of ['core', 'backup-validation', 'club-engines', 'club'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src/' + f + '.js'), 'utf8'), c);
  const notes = [];
  await c.AlibiClub.init({
    toast(text, bad) {
      notes.push(String(text));
    },
    render() {},
    settings: () => ({}),
    all: () => [],
    records: () => [],
    navigate() {},
    current: () => null,
    dialog() {},
  });
  assert.equal(
    c.AlibiClub.diagnostics().storageMode,
    'indexeddb',
    'restore-ordering harness runs on transactional storage',
  );
  await c.AlibiClub.flush();
  return { c, notes };
}

test('transaction completes only after chained requests settle', async () => {
  const { indexedDB } = makeDisk();
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // Each get is issued synchronously or from the previous success callback, which keeps a real
  // IndexedDB transaction active. Four 10 ms gets outlast the old fixed 30 ms completion timer.
  const tx = db.transaction();
  const order = [];
  const completed = new Promise((resolve) => {
    tx.oncomplete = () => {
      order.push('complete');
      resolve();
    };
  });
  const store = tx.objectStore();
  const chain = (n) => {
    const req = store.get('state');
    req.onsuccess = () => {
      order.push('get' + n);
      if (n < 4) chain(n + 1);
    };
  };
  chain(1);
  await completed;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(order, ['get1', 'get2', 'get3', 'get4', 'complete']);
});

test('puts reach the disk only when their transaction completes; abort discards them', async () => {
  const { disk, indexedDB } = makeDisk();
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  disk.set('state', { rev: 1 });
  const aborted = db.transaction();
  const aborting = new Promise((resolve) => {
    aborted.onabort = resolve;
  });
  const read = aborted.objectStore().get('state');
  read.onsuccess = () => {
    aborted.objectStore().put({ rev: 2 }, 'state');
    aborted.objectStore().put({ rev: 1 }, 'recovery');
    assert.deepEqual(disk.get('state'), { rev: 1 }, 'a put is not durable before complete');
    aborted.abort();
  };
  await aborting;
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(disk.get('state'), { rev: 1 }, 'an aborted put never reaches the disk');
  assert.equal(disk.has('recovery'), false);
  const committed = db.transaction();
  const completing = new Promise((resolve) => {
    committed.oncomplete = resolve;
  });
  const store = committed.objectStore();
  store.put({ rev: 2 }, 'state');
  const own = store.get('state');
  let seen;
  own.onsuccess = () => {
    seen = own.result;
  };
  await completing;
  assert.deepEqual(seen, { rev: 2 }, 'a transaction reads its own pending put');
  assert.deepEqual(disk.get('state'), { rev: 2 }, 'a completed put is durable');
});

test('stale old-state snapshot cannot overwrite a confirmed restore', async () => {
  const { disk, indexedDB } = makeDisk();
  const { c } = await tabWithDisk(disk, indexedDB);
  const pre = JSON.parse(JSON.stringify(disk.get('state')));
  const before = c.AlibiClub.diagnostics().state;
  const next = JSON.parse(JSON.stringify(before));
  next.settings.pinned = 999;
  next.visit = 777;
  c.__alibiPendingClub = next;
  // Start restore and interleave an ordinary pin while persist(next) is in flight.
  const restoreP = c.AlibiClub.action({ dataset: { action: 'club-restore-confirm' } });
  const staleP = c.AlibiClub.action({ dataset: { action: 'club-pin' } });
  await restoreP;
  await staleP;
  await c.AlibiClub.flush();
  const state = disk.get('state');
  assert.equal(
    state.data.settings.pinned,
    999,
    'restore replacement wins; interleaved old-state pin does not persist',
  );
  assert.equal(state.data.visit, 777, 'restored visit marker survives the race window');
  assert.equal(
    state.rev,
    pre.rev + 1,
    'exactly one restore write commits; no stale N+2 overwrite follows',
  );
  assert.deepEqual(
    disk.get('recovery'),
    pre,
    'restore recovery copy remains the true pre-restore save',
  );
  assert.equal(
    c.AlibiClub.diagnostics().state.settings.pinned,
    999,
    'in-memory state is the committed replacement, not uncommitted stale data',
  );
});

test('restore failure preserves existing state and error semantics', async () => {
  const { disk, indexedDB } = makeDisk();
  const { c } = await tabWithDisk(disk, indexedDB);
  const preDisk = JSON.parse(JSON.stringify(disk.get('state')));
  const preState = JSON.parse(JSON.stringify(c.AlibiClub.diagnostics().state));
  const next = JSON.parse(JSON.stringify(preState));
  next.settings.pinned = 888;
  c.__alibiPendingClub = next;
  const restoreP = c.AlibiClub.action({ dataset: { action: 'club-restore-confirm' } });
  // Simulate another tab committing before the restore transaction reads.
  const bumped = JSON.parse(JSON.stringify(disk.get('state')));
  bumped.rev += 5;
  disk.set('state', bumped);
  await restoreP;
  await c.AlibiClub.flush();
  const diag = c.AlibiClub.diagnostics();
  assert.match(diag.saveError, /another tab/, 'CAS conflict keeps the healthy-guard message');
  assert.deepEqual(
    diag.state,
    preState,
    'failed restore does not leave the uncommitted replacement in memory',
  );
  assert.equal(
    disk.get('state').rev,
    preDisk.rev + 5,
    'failed restore does not advance the revision',
  );
  assert.equal(disk.has('recovery'), false, 'failed restore writes no recovery copy');
});

test('source serializes restore replacement and invalidates the keeper', () => {
  const src = fs.readFileSync(path.join(root, 'src/club.js'), 'utf8');
  assert.match(src, /restoring\s*=\s*false/, 'restore serialization flag exists');
  assert.match(
    src,
    /if\s*\(\s*restoring\s*&&\s*!replacement\s*\)/,
    'ordinary persists are blocked while the replacement commits',
  );
  assert.match(
    src,
    /restoring\s*=\s*true[\s\S]*?finally\s*\{[\s\S]*?restoring\s*=\s*false/,
    'restore-confirm clears the flag on success and failure',
  );
  assert.match(
    src,
    /restore-confirm[\s\S]*?botJob\+\+/,
    'restore-confirm invalidates an in-flight keeper reply',
  );
});
