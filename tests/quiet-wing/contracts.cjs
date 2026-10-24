'use strict';
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const E = require('../../src/quiet-wing/engine.js'),
  code = fs.readFileSync(require.resolve('../../src/quiet-wing/storage.js'), 'utf8');
const { fakeLocks } = require('../helpers/fallback-locks.cjs');
let checks = 0;
const ok = (b, msg) => {
  assert.ok(b, msg);
  checks++;
};
function local() {
  const m = new Map();
  return {
    m,
    locks: fakeLocks(),
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
function env(storage, indexedDB, validateImport) {
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
    navigator: { locks: storage.locks },
    indexedDB,
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(code, c);
  // This storage-only fixture supplies the browser worker's validated result.
  c.AlibiValidateImport = validateImport || (async (m) => c.QWStore.validate(m.value));
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
  const overlaps = [];
  for (const phase of ['validation', 'transaction']) {
    const idb = fakeIDB(),
      original = E.newState(1700000000000),
      imported = E.newState(1700000001000),
      validation = Promise.withResolvers(),
      saving = Promise.withResolvers();
    original.scene.name = 'A';
    imported.scene.name = 'B';
    idb.data.set('state', structuredClone(original));
    let validations = 0;
    const { s } = env(local(), idb.api, async (m) => {
      validations++;
      await validation.promise;
      return s.validate(m.value);
    });
    await s.open();
    s.status((text, status) => {
      if (status === 'saving') saving.resolve();
    });
    const first = s.replace(imported);
    if (phase === 'transaction') {
      validation.resolve();
      await saving.promise;
    }
    // Two confirmations of the same reviewed B before the first restore finishes.
    const results = Promise.allSettled([first, s.replace(imported)]);
    validation.resolve();
    const settled = await results;
    overlaps.push({
      phase,
      current: idb.data.get('state').scene.name,
      recovery: idb.data.get('recovery').state.scene.name,
      revision: idb.data.get('state').revision,
      validations,
      outcomes: settled.map((result) => result.status),
    });
    assert.deepEqual(idb.data.get('recovery').state, original);
    const committed = structuredClone(idb.data.get('state')),
      invalid = E.clone(imported);
    invalid.garden.pots[0] = { seed: 'constructor', plantedAt: 1700000000000 };
    await assert.rejects(s.replace(invalid), /Invalid seed/);
    const transaction = idb.db.transaction;
    idb.db.transaction = () => {
      throw Error('Restore transaction failed');
    };
    await assert.rejects(s.replace(imported), /Restore transaction failed/);
    idb.db.transaction = transaction;
    assert.deepEqual(idb.data.get('state'), committed);
    assert.deepEqual(idb.data.get('recovery').state, original);
    // Failures release the guard, and a later reviewed restore can commit normally.
    const later = E.clone(imported);
    later.scene.name = 'C';
    await s.replace(later);
    assert.equal(idb.data.get('state').scene.name, 'C');
    assert.deepEqual(idb.data.get('recovery').state, committed);
    checks += 7;
  }
  assert.deepEqual(
    overlaps,
    ['validation', 'transaction'].map((phase) => ({
      phase,
      current: 'B',
      recovery: 'A',
      revision: 1,
      validations: 1,
      outcomes: ['fulfilled', 'rejected'],
    })),
    'Overlapping confirmations commit B once and retain recovery A',
  );
  checks++;
  const app = fs.readFileSync(require.resolve('../../src/quiet-wing/app.js'), 'utf8'),
    reviewStart = app.indexOf('async function reviewImport(f) {'),
    reviewEnd = app.indexOf("$('#file').onchange", reviewStart);
  assert.ok(reviewStart >= 0 && reviewEnd > reviewStart);
  for (const phase of ['transaction', 'flush']) {
    const idb = fakeIDB(),
      { s } = env(local(), idb.api),
      original = E.newState(1700000000000),
      imported = E.newState(1700000001000),
      flushing = Promise.withResolvers(),
      saving = Promise.withResolvers(),
      button = { disabled: false },
      messages = [];
    original.scene.name = 'A';
    imported.scene.name = 'B';
    idb.data.set('state', structuredClone(original));
    await s.open();
    s.status((text, status) => {
      if (status === 'saving') saving.resolve();
    });
    let flushes = 0;
    const review = vm.runInNewContext(app.slice(reviewStart, reviewEnd) + '; reviewImport;', {
      G: { AlibiValidateImport: async () => ({ isRealm: false, next: imported }) },
      S: s,
      A: { state: original, history: [], future: [] },
      $: () => button,
      modal: () => ({ close() {} }),
      esc: String,
      exportBackup() {},
      go() {},
      toast: (text) => messages.push(text),
      flush: async () => {
        flushes++;
        await flushing.promise;
        await s.flush();
      },
    });
    await review({ size: 2, text: async () => '{}' });
    const first = button.onclick();
    if (phase === 'transaction') {
      flushing.resolve();
      await saving.promise;
    }
    // Invoke the real handler twice, even if the synthetic button is disabled.
    const results = Promise.all([first, button.onclick()]);
    flushing.resolve();
    await results;
    await button.onclick();
    assert.deepEqual(idb.data.get('recovery').state, original, phase + ' keeps recovery A');
    assert.equal(idb.data.get('state').scene.name, 'B');
    assert.equal(idb.data.get('state').revision, 1);
    assert.equal(flushes, 1, phase + ' ignores re-entry before flushing');
    assert.equal(button.disabled, true, 'A successful confirmation stays consumed');
    assert.deepEqual(messages, ['Import complete.']);
    checks += 6;
  }
  {
    // A failed realm replace leaves undo history untouched and the button usable again.
    const before = E.newState(1700000000000),
      realm = E.newState(1700000002000).scene,
      button = { disabled: false },
      messages = [],
      A = { state: before, history: [], future: ['redo'] };
    realm.name = 'R';
    const review = vm.runInNewContext(app.slice(reviewStart, reviewEnd) + '; reviewImport;', {
      G: { AlibiValidateImport: async () => ({ isRealm: true, next: realm }) },
      S: {
        info: () => ({ mode: 'indexeddb' }),
        replace: async () => {
          throw Error('Replace failed.');
        },
      },
      A,
      E,
      $: () => button,
      modal: () => ({ close() {} }),
      esc: String,
      exportBackup() {},
      go() {},
      toast: (text) => messages.push(text),
      flush: async () => {},
    });
    await review({ size: 2, text: async () => '{}' });
    await button.onclick();
    assert.deepEqual(A.history, [], 'Failed realm replace adds no undo entry');
    assert.deepEqual(A.future, ['redo'], 'Failed realm replace keeps redo history');
    assert.equal(A.state, before);
    assert.equal(button.disabled, false, 'Failed restore re-enables the button');
    assert.deepEqual(messages, ['Replace failed.']);
    checks += 5;
  }
  const key = 'alibi-quiet-wing-v1:fallback',
    unguarded = local(),
    original = JSON.stringify(E.newState(Date.now()));
  unguarded.setItem(key, original);
  unguarded.setItem(key + ':recovery', 'legacy recovery bytes');
  unguarded.locks = undefined;
  const unguardedA = env(unguarded),
    unguardedB = env(unguarded);
  const noLockStates = [];
  for (const tab of [unguardedA, unguardedB]) {
    const opened = await tab.s.open();
    ok(
      opened.saved.scene.name === JSON.parse(original).scene.name,
      'No-lock fallback remains readable',
    );
    ok(!opened.blocked, 'Fallback without Web Locks remains writable');
    noLockStates.push(opened.saved);
  }
  noLockStates[0].scene.name = 'No-lock writer';
  await unguardedA.s.write(noLockStates[0]);
  await unguardedA.s.write(noLockStates[0]);
  const noLockCommitted = unguarded.getItem(key);
  ok(
    JSON.parse(noLockCommitted).scene.name === 'No-lock writer' &&
      JSON.parse(noLockCommitted).revision === 2,
    'Single-tab no-lock saves persist and advance the revision',
  );
  await assert.rejects(unguardedB.s.write(noLockStates[1]), /another tab|changed|export/i);
  ok(unguarded.getItem(key) === noLockCommitted, 'Stale no-lock writer preserves exact save bytes');
  const noLockDrift = JSON.parse(noLockCommitted);
  noLockDrift.schema = 999;
  const noLockFuture = JSON.stringify(noLockDrift);
  unguarded.setItem(key, noLockFuture);
  await assert.rejects(unguardedA.s.write(noLockStates[0]), /another tab|changed|export/i);
  ok(unguarded.getItem(key) === noLockFuture, 'No-lock same-revision drift preserves exact bytes');
  ok(
    (await unguardedA.s.raw()).recovery === 'legacy recovery bytes',
    'No-lock raw recovery stays exportable',
  );
  ok(
    unguardedA.statuses.some((s) => /export/i.test(s.text)),
    'No-lock status directs the player to export',
  );

  const guarded = local(),
    guardedTab = env(guarded);
  await guardedTab.s.open();
  await guardedTab.s.write(E.newState(Date.now()));
  ok(
    guardedTab.statuses.at(-1)?.text === 'Saved · local storage fallback',
    'Successful fallback status names local storage without claiming single-tab use',
  );
  const committed = guarded.getItem(key);
  let release;
  const held = guarded.locks.request(
    key,
    { ifAvailable: true },
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  await Promise.resolve();
  await assert.rejects(guardedTab.s.write(E.newState(Date.now())), /another tab|export/i);
  ok(guarded.getItem(key) === committed, 'Held lock refuses a concurrent fallback write');
  release();
  await held;

  const openingStore = local(),
    openingState = E.newState(Date.now());
  openingStore.setItem(key, JSON.stringify(openingState));
  let releaseOpen;
  const heldOpen = openingStore.locks.request(
    key,
    { ifAvailable: true },
    () =>
      new Promise((resolve) => {
        releaseOpen = resolve;
      }),
  );
  await Promise.resolve();
  const openingTab = env(openingStore),
    openedWhileBusy = await openingTab.s.open();
  ok(
    openedWhileBusy.mode === 'local' &&
      !openedWhileBusy.blocked &&
      openedWhileBusy.saved?.scene.name === openingState.scene.name,
    'A lock miss during open still reads the atomic localStorage snapshot',
  );
  ok(
    openingStore.getItem(key) === JSON.stringify(openingState),
    'Reading after a lock miss leaves the fallback bytes unchanged',
  );
  ok(
    openingTab.statuses.some((s) => s.status === 'warning' && /another tab/i.test(s.text)),
    'The open lock miss is identified as temporary contention',
  );
  const editedWhileBusy = structuredClone(openedWhileBusy.saved);
  editedWhileBusy.scene.name = 'Opened while another tab held the lock';
  await assert.rejects(openingTab.s.write(editedWhileBusy), /another tab|export/i);
  ok(
    openingStore.getItem(key) === JSON.stringify(openingState),
    'A write still cannot bypass a currently held lock',
  );
  releaseOpen();
  await heldOpen;
  await openingTab.s.write(editedWhileBusy);
  ok(
    JSON.parse(openingStore.getItem(key)).scene.name === editedWhileBusy.scene.name,
    'The read snapshot saves after contention clears when its bytes are still current',
  );
  let releaseSecondOpen;
  const heldSecondOpen = openingStore.locks.request(
    key,
    { ifAvailable: true },
    () =>
      new Promise((resolve) => {
        releaseSecondOpen = resolve;
      }),
  );
  await Promise.resolve();
  const staleTab = env(openingStore),
    staleOpen = await staleTab.s.open(),
    winnerTab = env(openingStore),
    winnerOpen = await winnerTab.s.open();
  ok(
    !staleOpen.blocked && !winnerOpen.blocked,
    'Two lock-miss reads remain available while preserving their observed revision',
  );
  releaseSecondOpen();
  await heldSecondOpen;
  const winnerEdit = structuredClone(winnerOpen.saved);
  winnerEdit.scene.name = 'Concurrent writer wins';
  await winnerTab.s.write(winnerEdit);
  const winnerBytes = openingStore.getItem(key);
  const staleEdit = structuredClone(staleOpen.saved);
  staleEdit.scene.name = 'Stale lock-miss edit';
  await assert.rejects(staleTab.s.write(staleEdit), /another tab|changed|export/i);
  ok(
    openingStore.getItem(key) === winnerBytes &&
      JSON.parse(winnerBytes).scene.name === winnerEdit.scene.name,
    'A lock-miss snapshot cannot overwrite a newer save after its lock is released',
  );

  const absentStore = local();
  let releaseAbsent;
  const heldAbsent = absentStore.locks.request(
    key,
    { ifAvailable: true },
    () =>
      new Promise((resolve) => {
        releaseAbsent = resolve;
      }),
  );
  await Promise.resolve();
  const absentTab = env(absentStore),
    absentOpen = await absentTab.s.open();
  ok(
    !absentOpen.blocked && absentOpen.saved === null,
    'A truly absent save remains a writable empty snapshot after a lock miss',
  );
  releaseAbsent();
  await heldAbsent;
  const firstSave = E.newState(Date.now());
  await absentTab.s.write(firstSave);
  ok(
    JSON.parse(absentStore.getItem(key)).revision === 1,
    'An absent lock-miss snapshot can create its first save after contention clears',
  );

  const futureSave = E.newState(Date.now());
  futureSave.schema = 999;
  const invalidLockMissRecords = [
    ['empty stored bytes', ''],
    ['malformed JSON', '{broken'],
    ['false scalar', 'false'],
    ['zero scalar', '0'],
    ['null scalar', 'null'],
    ['empty-string scalar', '""'],
    ['unknown future save', JSON.stringify(futureSave)],
  ];
  for (const [label, bytes] of invalidLockMissRecords) {
    const invalidStore = local(),
      recoveryBytes = `recovery for ${label}`;
    invalidStore.setItem(key, bytes);
    invalidStore.setItem(key + ':recovery', recoveryBytes);
    let releaseInvalid;
    const heldInvalid = invalidStore.locks.request(
      key,
      { ifAvailable: true },
      () =>
        new Promise((resolve) => {
          releaseInvalid = resolve;
        }),
    );
    await Promise.resolve();
    const invalidTab = env(invalidStore),
      invalidOpen = await invalidTab.s.open();
    releaseInvalid();
    await heldInvalid;
    ok(invalidOpen.blocked && invalidOpen.saved === null, `Lock-miss ${label} remains protected`);
    ok(
      invalidStore.getItem(key) === bytes &&
        invalidStore.getItem(key + ':recovery') === recoveryBytes,
      `Lock-miss ${label} preserves primary and existing recovery bytes`,
    );
    await assert.rejects(
      invalidTab.s.write(E.newState(Date.now())),
      /read-only|unreadable|protected/i,
      `Lock-miss ${label} rejects later writes`,
    );
    ok(
      invalidStore.getItem(key) === bytes &&
        invalidStore.getItem(key + ':recovery') === recoveryBytes,
      `A later write cannot overwrite lock-miss ${label}`,
    );
  }

  const normalCorruptStore = local(),
    normalCorruptTab = env(normalCorruptStore);
  normalCorruptStore.setItem(key, '{broken');
  const normalCorruptOpen = await normalCorruptTab.s.open();
  ok(
    !normalCorruptOpen.blocked && normalCorruptOpen.saved === null,
    'An admitted open can still quarantine malformed JSON and start empty',
  );
  ok(
    normalCorruptStore.getItem(key) === null &&
      normalCorruptStore.getItem(key + ':recovery') === '{broken',
    'Malformed JSON is removed only after its bytes reach the recovery slot',
  );
  await normalCorruptTab.s.write(E.newState(Date.now()));
  ok(
    JSON.parse(normalCorruptStore.getItem(key)).revision === 1 &&
      normalCorruptStore.getItem(key + ':recovery') === '{broken',
    'A successfully quarantined malformed save does not block a later first write',
  );

  const restarted = env(guarded),
    loaded = await restarted.s.open();
  await restarted.s.write(loaded.saved);
  const drift = JSON.parse(guarded.getItem(key));
  drift.schema = 999;
  const futureBytes = JSON.stringify(drift);
  guarded.setItem(key, futureBytes);
  await assert.rejects(restarted.s.write(loaded.saved), /another tab|changed|export/i);
  ok(guarded.getItem(key) === futureBytes, 'Same-revision format drift preserves exact bytes');

  const concurrent = local(),
    baseline = E.newState(Date.now());
  concurrent.setItem(key, JSON.stringify(baseline));
  const firstTab = env(concurrent),
    secondTab = env(concurrent);
  const firstState = (await firstTab.s.open()).saved;
  const secondState = (await secondTab.s.open()).saved;
  firstState.scene.name = 'First context';
  secondState.scene.name = 'Second context';
  const writes = await Promise.allSettled([
    firstTab.s.write(firstState),
    secondTab.s.write(secondState),
  ]);
  ok(
    writes.filter((r) => r.status === 'fulfilled').length === 1,
    'Shared-lock same-revision writes admit at most one context',
  );
  const winner = writes[0].status === 'fulfilled' ? firstState : secondState;
  ok(
    JSON.parse(concurrent.getItem(key)).scene.name === winner.scene.name,
    'Reopening retains the successful context, never the refused context',
  );
  ok(
    (await env(concurrent).s.open()).saved.scene.name === winner.scene.name,
    'A restarted context reads the winner',
  );

  const stalledFallback = local();
  const stalled = env(stalledFallback, {
    open() {
      return {};
    },
  });
  const stalledResult = await stalled.s.open();
  ok(
    stalledResult.blocked && stalledResult.mode === 'protected',
    'An ambiguous open timeout stays protected instead of forking a fallback save',
  );
  await assert.rejects(stalled.s.write(E.newState(Date.now())), /./);
  ok(stalledFallback.m.size === 0, 'Timed-out open creates no fallback edits');
  const ls = local(),
    a = env(ls),
    r = await a.s.open();
  ok(r.mode === 'local', 'Fallback explicitly local');
  const x = E.newState(Date.now());
  await a.s.write(x);
  ok(a.s.info().revision === 1, 'Revision increment');
  ok(
    [...ls.m.keys()].join(',') === 'alibi-quiet-wing-v1:fallback',
    'Quiet Wing fallback writes its primary origin-scoped key',
  );
  ls.setItem('alibi-quiet-wing-v1:fallback:recovery', '{"sentinel":"preserve"}');
  const rawFallback = await a.s.raw();
  ok(
    rawFallback.recovery === '{"sentinel":"preserve"}',
    'Quiet Wing raw export preserves the optional fallback recovery bytes',
  );
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
  const ps = local(),
    pw = env(ps);
  await pw.s.open();
  await pw.s.write(E.newState(Date.now()));
  ps.setItem('alibi-quiet-wing-v1:fallback', '{broken');
  await assert.rejects(pw.s.write(E.newState(Date.now())), /could not be read/);
  ok(
    ps.getItem('alibi-quiet-wing-v1:fallback') === '{broken',
    'Failed persist preserves the unreadable record',
  );
  ok(
    pw.statuses.some((s) => s.text.includes('could not be read')),
    'Corrupt fallback persist reports a plain-language error',
  );
  const c = env(ls);
  await c.s.open();
  await assert.rejects(c.s.replace(E.newState(Date.now())), /Restore requires IndexedDB/);
  ok(
    JSON.parse(ls.getItem('alibi-quiet-wing-v1:fallback')).scene.name === 'Latest',
    'Fallback restore refused without changing data',
  );
  ok(
    ls.getItem('alibi-quiet-wing-v1:fallback:recovery') === '{"sentinel":"preserve"}',
    'Fallback restore refusal preserves the recovery bytes',
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
  const overflowDB = fakeIDB(),
    overflowOriginal = E.newState(Date.now()),
    overflowRecovery = { at: 42, state: { future: 'preserve' } };
  overflowOriginal.revision = Number.MAX_SAFE_INTEGER + 1;
  overflowOriginal.scene.name = 'Protected overflow original';
  overflowDB.data.set('state', structuredClone(overflowOriginal));
  overflowDB.data.set('recovery', structuredClone(overflowRecovery));
  const overflowA = env(local(), overflowDB.api),
    overflowB = env(local(), overflowDB.api);
  await overflowA.s.open();
  await overflowB.s.open();
  const firstOverflow = E.newState(Date.now()),
    staleOverflow = E.newState(Date.now());
  firstOverflow.scene.name = 'First writer';
  staleOverflow.scene.name = 'Stale writer';
  const overflowWrites = await Promise.allSettled([
    overflowA.s.write(firstOverflow),
    overflowB.s.write(staleOverflow),
  ]);
  console.log({
    precisionBoundary: overflowWrites.map((r) => r.status),
    revision: overflowDB.data.get('state').revision,
    name: overflowDB.data.get('state').scene.name,
  });
  ok(
    overflowWrites.every((r) => r.status === 'rejected'),
    'Both overflow writers are refused instead of reporting unchanged-revision success',
  );
  assert.deepEqual(overflowDB.data.get('state'), overflowOriginal);
  assert.deepEqual(overflowDB.data.get('recovery'), overflowRecovery);
  checks += 2;
  for (const mode of ['local', 'indexeddb']) {
    const boundaryLocal = local(),
      boundaryDB = fakeIDB(),
      boundaryState = E.newState(Date.now()),
      boundaryRecovery = { at: 43, state: { sentinel: 'preserve' } };
    boundaryState.revision = Number.MAX_SAFE_INTEGER - 1;
    if (mode === 'indexeddb') {
      boundaryDB.data.set('state', structuredClone(boundaryState));
      boundaryDB.data.set('recovery', structuredClone(boundaryRecovery));
    } else {
      boundaryLocal.setItem('alibi-quiet-wing-v1:fallback', JSON.stringify(boundaryState));
      boundaryLocal.setItem(
        'alibi-quiet-wing-v1:fallback:recovery',
        JSON.stringify(boundaryRecovery),
      );
    }
    const boundary = env(boundaryLocal, mode === 'indexeddb' ? boundaryDB.api : undefined),
      opened = await boundary.s.open();
    opened.saved.scene.name = 'Final safe edit';
    const eqRevision = await boundary.s.write(opened.saved);
    ok(eqRevision === Number.MAX_SAFE_INTEGER, mode + ' advances to the final safe revision');
    const lastBytes =
      mode === 'indexeddb'
        ? structuredClone(boundaryDB.data.get('state'))
        : boundaryLocal.getItem('alibi-quiet-wing-v1:fallback');
    opened.saved.scene.name = 'Refused edit';
    await assert.rejects(boundary.s.write(opened.saved), /revision/i);
    checks++;
    if (mode === 'indexeddb') {
      await assert.rejects(boundary.s.replace(E.newState(Date.now())), /revision/i);
      assert.deepEqual(boundaryDB.data.get('state'), lastBytes);
      assert.deepEqual(boundaryDB.data.get('recovery'), boundaryRecovery);
      checks += 3;
    } else {
      ok(
        boundaryLocal.getItem('alibi-quiet-wing-v1:fallback') === lastBytes,
        'Refused fallback edit preserves exact bytes',
      );
      ok(
        boundaryLocal.getItem('alibi-quiet-wing-v1:fallback:recovery') ===
          JSON.stringify(boundaryRecovery),
        'Fallback recovery bytes stay intact',
      );
      const unsafeBytes = '  ' + JSON.stringify(overflowOriginal) + '\n';
      boundaryLocal.setItem('alibi-quiet-wing-v1:fallback', unsafeBytes);
      const unsafeFallback = env(boundaryLocal);
      ok((await unsafeFallback.s.open()).blocked, 'Unsafe fallback revision loads protected');
      await assert.rejects(unsafeFallback.s.write(E.newState(Date.now())), /read-only/);
      ok(
        boundaryLocal.getItem('alibi-quiet-wing-v1:fallback') === unsafeBytes,
        'Unsafe fallback bytes remain exact',
      );
    }
  }
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
      'Adapter exercised with exact local fallback and recovery keys plus transactional IndexedDB fixtures, including conflicts, corrupt persist message, protected fields, raw fallback recovery, restore and timeout/abort; actual import confirmation handler exercised in a simulated UI. Not actual browser persistence or service-worker lifecycle.',
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
