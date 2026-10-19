'use strict';
// Club restore-ordering regression: stale old-state snapshots must not
// overwrite a confirmed restore. Uses a fake IndexedDB that models the exact
// shared-queue + CAS + recovery contract deterministically with deferred
// transactions so the restore window stays open for an interleaved move.
// Transaction completion waits for pending requests, matching IndexedDB
// auto-commit (a transaction never completes while a request is pending). Puts stay buffered
// in their transaction (visible to its own later reads) and reach the disk only on complete;
// abort discards them. An explicit abort fails each still-pending request with
// AbortError, running those callbacks before the transaction abort event, and
// does not also complete. Creation and request callbacks allow immediate microtasks;
// activity expires before subsequently queued timer callbacks. The 30 ms
// completion delay controls interleaving, not permission to enqueue requests.
// Overlapping scopes wait in creation order whenever either transaction writes,
// including a predecessor still waiting to start. Scope scheduling is bounded;
// the disk map models Club keys, not full object-store isolation or IDB events.
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
  const transactions = [];
  function startReadyTransactions() {
    for (const entry of transactions) {
      if (entry.started || entry.finished) continue;
      const blocked = transactions
        .slice(0, transactions.indexOf(entry))
        .some(
          (earlier) =>
            !earlier.finished &&
            (entry.mode === 'readwrite' || earlier.mode === 'readwrite') &&
            [...entry.scope].some((name) => earlier.scope.has(name)),
        );
      if (!blocked) entry.start();
    }
  }
  const db = {
    onversionchange: null,
    close() {},
    transaction(names, mode = 'readonly') {
      const entry = {
        scope: new Set(Array.isArray(names) ? names : [names]),
        mode,
        started: false,
        finished: false,
        requests: [],
        start() {
          entry.started = true;
          for (const request of entry.requests) request();
          entry.requests.length = 0;
          maybeComplete();
        },
      };
      const listeners = { complete: [], error: [], abort: [] };
      const pendingRequests = [];
      let aborted = false;
      let pending = 0;
      let generation = 0;
      let completed = false;
      let active = false;
      let activityEpoch = 0;
      function forgetRequest(req) {
        const index = pendingRequests.indexOf(req);
        if (index !== -1) pendingRequests.splice(index, 1);
      }
      // One delivery: the abort task reports still-open requests, and a later
      // request timer must not succeed or report the same request again.
      function failAborted(req) {
        if (req.done) return;
        req.done = true;
        req.result = undefined;
        req.error = Object.assign(Error('The transaction was aborted.'), {
          name: 'AbortError',
        });
        forgetRequest(req);
        pending -= 1;
        const event = {
          target: req,
          currentTarget: req,
          bubbles: true,
          cancelable: true,
          defaultPrevented: false,
          cancelBubble: false,
          preventDefault() {
            this.defaultPrevented = true;
          },
          stopPropagation() {
            this.cancelBubble = true;
          },
        };
        try {
          if (req.onerror) req.onerror(event);
        } catch {}
        if (!event.cancelBubble) {
          event.currentTarget = tx;
          try {
            if (tx.onerror) tx.onerror(event);
          } catch {}
          for (const listener of listeners.error) {
            try {
              listener(event);
            } catch {}
          }
        }
      }
      function activate() {
        active = true;
        const epoch = ++activityEpoch;
        // Defer deactivation past callback microtasks, but queue it before timers
        // that the caller creates after this transaction/request callback.
        setTimeout(() => {
          if (epoch === activityEpoch) active = false;
        }, 0);
      }
      function requireActive() {
        if (aborted || completed || !active)
          throw Object.assign(Error('The transaction is inactive.'), {
            name: 'TransactionInactiveError',
          });
      }
      const writes = new Map();
      function fireComplete() {
        if (aborted || completed) return;
        if (pending !== 0) return;
        completed = true;
        entry.finished = true;
        active = false;
        for (const [key, value] of writes) disk.set(key, value);
        try {
          if (tx.oncomplete) tx.oncomplete();
        } catch {}
        for (const f of listeners.complete) {
          try {
            f();
          } catch {}
        }
        startReadyTransactions();
      }
      function maybeComplete() {
        if (aborted || completed || !entry.started) return;
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
              requireActive();
              pending += 1;
              generation += 1;
              const req = {
                result: undefined,
                error: null,
                onsuccess: null,
                onerror: null,
                done: false,
              };
              pendingRequests.push(req);
              // Requests run in queue order: only puts queued before this get are visible to it.
              const queuedOwn = writes.has(key),
                own = writes.get(key);
              const runRequest = () =>
                setTimeout(() => {
                  if (req.done) return;
                  if (aborted) {
                    failAborted(req);
                    return;
                  }
                  const raw = queuedOwn ? own : disk.get(key);
                  req.result = raw === undefined ? undefined : JSON.parse(JSON.stringify(raw));
                  req.done = true;
                  forgetRequest(req);
                  pending -= 1;
                  activate();
                  if (req.onsuccess) req.onsuccess();
                  maybeComplete();
                }, 10);
              if (entry.started) runRequest();
              else entry.requests.push(runRequest);
              return req;
            },
            put(value, key) {
              requireActive();
              generation += 1;
              writes.set(key, JSON.parse(JSON.stringify(value)));
              maybeComplete();
            },
          };
        },
        addEventListener(ev, fn) {
          if (listeners[ev]) listeners[ev].push(fn);
        },
        abort() {
          if (completed || aborted)
            throw Object.assign(Error('The transaction has finished.'), {
              name: 'InvalidStateError',
            });
          aborted = true;
          active = false;
          writes.clear();
          const doomed = pendingRequests.slice();
          setTimeout(() => {
            // Request errors share this task and run before abort. Success
            // callbacks still precede complete on the commit path.
            for (const req of doomed) failAborted(req);
            try {
              if (tx.onabort) tx.onabort();
            } catch {}
            for (const f of listeners.abort) {
              try {
                f();
              } catch {}
            }
            entry.finished = true;
            entry.requests.length = 0;
            startReadyTransactions();
          }, 0);
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
      activate();
      transactions.push(entry);
      startReadyTransactions();
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
  const tx = db.transaction('club', 'readwrite');
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
  const aborted = db.transaction('club', 'readwrite');
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
  const committed = db.transaction('club', 'readwrite');
  const completing = new Promise((resolve) => {
    committed.oncomplete = resolve;
  });
  const store = committed.objectStore();
  const before = store.get('state');
  let earlier;
  before.onsuccess = () => {
    earlier = before.result;
  };
  store.put({ rev: 2 }, 'state');
  const own = store.get('state');
  let seen;
  own.onsuccess = () => {
    seen = own.result;
  };
  await completing;
  assert.deepEqual(earlier, { rev: 1 }, 'a get queued before a put does not see it');
  assert.deepEqual(seen, { rev: 2 }, 'a transaction reads its own pending put');
  assert.deepEqual(disk.get('state'), { rev: 2 }, 'a completed put is durable');
});

async function fixtureTransaction() {
  const { disk, indexedDB } = makeDisk();
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const tx = db.transaction('club', 'readwrite');
  return { disk, tx, store: tx.objectStore() };
}

async function scopedFixture() {
  const fixture = makeDisk();
  const db = await new Promise((resolve, reject) => {
    const req = fixture.indexedDB.open();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return { ...fixture, db };
}

function completedTransaction(tx, order, label) {
  return new Promise((resolve) => {
    tx.oncomplete = () => {
      order.push(label);
      resolve();
    };
  });
}

test(
  'overlapping readwrite transactions read the previous committed revision',
  { timeout: 1000 },
  async () => {
    const { disk, db } = await scopedFixture();
    disk.set('state', { rev: 1 });
    const order = [];
    const first = db.transaction('club', 'readwrite');
    const firstDone = completedTransaction(first, order, 'first complete');
    first.objectStore('club').put({ rev: 2 }, 'state');
    const second = db.transaction('club', 'readwrite');
    const secondDone = completedTransaction(second, order, 'second complete');
    const read = second.objectStore('club').get('state');
    let seen;
    read.onsuccess = () => {
      seen = read.result;
      order.push('second read');
    };
    await Promise.all([firstDone, secondDone]);
    assert.deepEqual(seen, { rev: 2 });
    assert.deepEqual(order, ['first complete', 'second read', 'second complete']);
  },
);

test('readonly transactions wait for earlier overlapping writers', { timeout: 1000 }, async () => {
  const { disk, db } = await scopedFixture();
  disk.set('state', { rev: 1 });
  const order = [];
  const writer = db.transaction('club', 'readwrite');
  const writerDone = completedTransaction(writer, order, 'writer complete');
  writer.objectStore('club').put({ rev: 2 }, 'state');
  const reader = db.transaction('club', 'readonly');
  const readerDone = completedTransaction(reader, order, 'reader complete');
  const read = reader.objectStore('club').get('state');
  let seen;
  read.onsuccess = () => {
    seen = read.result;
    order.push('reader read');
  };
  await Promise.all([writerDone, readerDone]);
  assert.deepEqual(seen, { rev: 2 });
  assert.deepEqual(order, ['writer complete', 'reader read', 'reader complete']);
});

test(
  'readwrite transactions wait for earlier overlapping readers to finish',
  { timeout: 1000 },
  async () => {
    const { disk, db } = await scopedFixture();
    disk.set('state', { rev: 1 });
    const order = [];
    const reader = db.transaction('club', 'readonly');
    const readerDone = completedTransaction(reader, order, 'reader complete');
    const read = reader.objectStore('club').get('state');
    let seen;
    read.onsuccess = () => {
      seen = read.result;
      order.push('reader read');
    };
    const writer = db.transaction('club', 'readwrite');
    const writerDone = completedTransaction(writer, order, 'writer complete');
    writer.objectStore('club').put({ rev: 2 }, 'state');
    await Promise.all([readerDone, writerDone]);
    assert.deepEqual(seen, { rev: 1 });
    assert.deepEqual(order, ['reader read', 'reader complete', 'writer complete']);
    assert.deepEqual(disk.get('state'), { rev: 2 });
  },
);

test(
  'a waiting multi-store writer cannot be bypassed by a later overlapping writer',
  { timeout: 1000 },
  async () => {
    const { db } = await scopedFixture();
    const order = [];
    const first = db.transaction('club', 'readwrite');
    const firstDone = completedTransaction(first, order, 'first complete');
    first.objectStore('club').put('first', 'state');
    const middle = db.transaction(['club', 'meta'], 'readwrite');
    const middleDone = completedTransaction(middle, order, 'middle complete');
    middle.objectStore('meta').put('middle', 'marker');
    const last = db.transaction('meta', 'readwrite');
    const lastDone = completedTransaction(last, order, 'last complete');
    const read = last.objectStore('meta').get('marker');
    let seen;
    read.onsuccess = () => {
      seen = read.result;
      order.push('last read');
    };
    await Promise.all([firstDone, middleDone, lastDone]);
    assert.equal(seen, 'middle');
    assert.deepEqual(order, ['first complete', 'middle complete', 'last read', 'last complete']);
  },
);

test(
  'aborting the earlier writer releases the queued reader without its buffered writes',
  { timeout: 1000 },
  async () => {
    const { disk, db } = await scopedFixture();
    disk.set('state', { rev: 1 });
    const order = [];
    const writer = db.transaction('club', 'readwrite');
    writer.objectStore('club').put({ rev: 2 }, 'state');
    const aborted = new Promise((resolve) => {
      writer.onabort = () => {
        order.push('writer abort');
        resolve();
      };
    });
    const reader = db.transaction('club', 'readwrite');
    const readerDone = completedTransaction(reader, order, 'reader complete');
    const read = reader.objectStore('club').get('state');
    let seen;
    read.onsuccess = () => {
      seen = read.result;
      order.push('reader read');
    };
    await new Promise((resolve) => setTimeout(resolve, 20));
    const beforeAbort = [...order];
    writer.abort();
    await Promise.all([aborted, readerDone]);
    assert.deepEqual(
      beforeAbort,
      [],
      'a queued request cannot observe the disk before its predecessor finishes',
    );
    assert.deepEqual(seen, { rev: 1 });
    assert.deepEqual(order, ['writer abort', 'reader read', 'reader complete']);
    assert.deepEqual(disk.get('state'), { rev: 1 });
  },
);

test('creation and request callback microtasks can enqueue writes', async () => {
  const { disk, tx, store } = await fixtureTransaction();
  const completed = new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
  store.put('creation', 'creation');
  await Promise.resolve();
  store.put('creation microtask', 'creation-microtask');
  const req = store.get('creation');
  req.onsuccess = () => {
    store.put('callback', 'callback');
    Promise.resolve().then(() => {
      store.put('callback microtask', 'callback-microtask');
    });
  };
  await completed;
  assert.deepEqual([...disk.keys()].sort(), [
    'callback',
    'callback-microtask',
    'creation',
    'creation-microtask',
  ]);
});

test('an unrelated timer cannot enqueue requests while a read is pending', async () => {
  const { disk, tx, store } = await fixtureTransaction();
  let finished = false;
  const completed = new Promise((resolve) => {
    tx.oncomplete = () => {
      finished = true;
      resolve();
    };
  });
  store.get('state');
  await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(finished, false, 'the transaction has not completed');
  assert.throws(() => store.put('late', 'late'), { name: 'TransactionInactiveError' });
  assert.throws(() => store.get('state'), { name: 'TransactionInactiveError' });
  await completed;
  assert.equal(disk.has('late'), false);
});

test('put after completion throws and preserves the committed value', async () => {
  const { disk, tx, store } = await fixtureTransaction();
  const completed = new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
  store.put('committed', 'state');
  await completed;
  assert.throws(() => store.put('late', 'state'), { name: 'TransactionInactiveError' });
  assert.equal(disk.get('state'), 'committed');
});

test('put after abort throws and never commits its buffered value', async () => {
  const { disk, tx, store } = await fixtureTransaction();
  const aborted = new Promise((resolve) => {
    tx.onabort = resolve;
  });
  store.put('buffered', 'state');
  tx.abort();
  assert.throws(() => store.put('late', 'state'), { name: 'TransactionInactiveError' });
  await aborted;
  assert.equal(disk.has('state'), false);
});

test('abort after completion throws without emitting an abort event', async () => {
  const { disk, tx, store } = await fixtureTransaction();
  let aborts = 0,
    caught;
  tx.onabort = () => {
    aborts += 1;
  };
  const completed = new Promise((resolve) => {
    tx.oncomplete = () => {
      try {
        tx.abort();
      } catch (error) {
        caught = error.name;
      }
      resolve();
    };
  });
  store.put('committed', 'state');
  await completed;
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(caught, 'InvalidStateError');
  assert.equal(aborts, 0);
  assert.equal(disk.get('state'), 'committed');
});

test('a second abort throws InvalidStateError', async () => {
  const { tx } = await fixtureTransaction();
  const aborted = new Promise((resolve) => {
    tx.onabort = resolve;
  });
  tx.abort();
  assert.throws(() => tx.abort(), { name: 'InvalidStateError' });
  await aborted;
});

test('explicit abort delivers pending AbortError callbacks before the transaction abort event', async () => {
  const { disk, db } = await scopedFixture();
  const order = [];
  const writer = db.transaction('club', 'readwrite');
  writer.objectStore('club').put('held', 'state');
  const blocked = db.transaction('club', 'readonly');
  const waiting = blocked.objectStore('club').get('state');
  waiting.onsuccess = () => order.push('blocked-success');
  waiting.onerror = () => {
    order.push('blocked-error:' + waiting.error?.name + ':' + String(waiting.result));
  };
  blocked.onerror = () => order.push('blocked-tx-error');
  blocked.oncomplete = () => order.push('blocked-complete');
  blocked.onabort = () => order.push('blocked-abort');
  const active = db.transaction('meta', 'readwrite');
  const inflight = active.objectStore('meta').get('marker');
  inflight.onsuccess = () => order.push('inflight-success');
  inflight.onerror = () => {
    order.push('inflight-error:' + inflight.error?.name + ':' + String(inflight.result));
  };
  active.onerror = () => order.push('active-tx-error');
  active.oncomplete = () => order.push('active-complete');
  active.onabort = () => order.push('active-abort');
  active.abort();
  blocked.abort();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(order, [
    'inflight-error:AbortError:undefined',
    'active-tx-error',
    'active-abort',
    'blocked-error:AbortError:undefined',
    'blocked-tx-error',
    'blocked-abort',
  ]);
  assert.equal(disk.get('state'), 'held');
  assert.equal(disk.has('marker'), false);
});

test('preventDefault preserves error bubbling while stopPropagation suppresses it', async () => {
  const { db } = await scopedFixture();
  const tx = db.transaction('club', 'readwrite');
  const cancelled = tx.objectStore('club').get('state');
  const stopped = tx.objectStore('club').get('marker');
  const seen = [];
  cancelled.onerror = (event) => event.preventDefault();
  stopped.onerror = (event) => event.stopPropagation();
  tx.onerror = (event) => {
    assert.equal(event.target, cancelled);
    assert.equal(event.currentTarget, tx);
    assert.equal(event.defaultPrevented, true);
    seen.push('property');
  };
  tx.addEventListener('error', () => seen.push('listener'));
  const aborted = new Promise((resolve) => (tx.onabort = resolve));
  tx.abort();
  await aborted;
  assert.deepEqual(seen, ['property', 'listener']);
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

test('an exported save cannot persist stale state while a confirmed restore is in flight', async () => {
  const { disk, indexedDB } = makeDisk();
  const { c } = await tabWithDisk(disk, indexedDB);
  const pre = JSON.parse(JSON.stringify(disk.get('state')));
  const next = JSON.parse(JSON.stringify(c.AlibiClub.diagnostics().state));
  next.settings.pinned = 999;
  next.visit = 777;
  c.__alibiPendingClub = next;
  const restoreP = c.AlibiClub.action({ dataset: { action: 'club-restore-confirm' } });
  // save() bypasses action()'s restoring check, exercising persist's own guard.
  const staleP = c.AlibiClub.save();
  await restoreP;
  await staleP;
  await c.AlibiClub.flush();
  const state = disk.get('state');
  assert.equal(state.data.settings.pinned, 999, 'the replacement remains on disk');
  assert.equal(state.data.visit, 777, 'the restored visit marker remains on disk');
  assert.equal(state.rev, pre.rev + 1, 'an old-state save cannot add a stale N+2 write');
  assert.deepEqual(disk.get('recovery'), pre, 'the true pre-restore recovery copy survives');
  assert.equal(c.AlibiClub.diagnostics().state.settings.pinned, 999);
  assert.equal(c.AlibiClub.diagnostics().saveError, '');
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
