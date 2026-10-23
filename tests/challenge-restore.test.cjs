'use strict';
// fix-challenge-restore: an explicit restore replaces a protected challenge
// save while retaining the replaced bytes at recovery:+id. Registry harness
// from tests/challenge-library.test.cjs; fake IndexedDB follows the
// tests/challenge-storage-revision.test.cjs databaseWith pattern (raw
// records surfaced through request.result) extended to a keyed disk so the
// raw recovery:+id key is observable. No new dependencies.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const quiet = require('../src/quiet-wing/engine.js');
const club = require('../src/club-engines.js');
const catalogue = require('../tools/challenge-catalogue.cjs');
const registry = require('../src/challenges.js').create(catalogue.runtime(catalogue.load()), {
  quiet,
  club,
});
const ID = 'curated-classic-hanoi-01';

function validateImport(message) {
  return Promise.resolve().then(() => {
    let result;
    const context = vm.createContext({
      TextEncoder,
      AlibiChallenges: { create: () => registry },
      ALIBI_CHALLENGE_DATA: {},
      QWEngine: quiet,
      AlibiClubEngines: club,
    });
    context.self = context;
    context.postMessage = (value) => (result = value);
    vm.runInContext(fs.readFileSync('src/validator-worker.js', 'utf8'), context);
    context.onmessage({ data: structuredClone(message) });
    if (!result.ok) throw Error(result.error);
    return structuredClone(result.value);
  });
}

function loadStore(indexedDB, worker = validateImport) {
  const context = {
    clearTimeout,
    console,
    Date,
    indexedDB,
    JSON,
    Map,
    module: { exports: {} },
    setTimeout,
    structuredClone,
    AlibiValidateImport: worker,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/challenge-storage.js'), 'utf8'), context);
  return context.module.exports;
}

// Minimal synchronous IndexedDB double: raw records keyed by id, staged puts
// applied on commit and discarded on abort.
function database(seeds = {}, abortWrites = false) {
  const disk = new Map(Object.entries(seeds));
  const db = {
    close() {},
    transaction() {
      const staged = [];
      const transaction = {
        error: null,
        aborted: false,
        abort() {
          this.aborted = true;
          this.onabort?.();
        },
        objectStore() {
          return {
            get(key) {
              const request = {};
              queueMicrotask(() => {
                if (transaction.aborted) return;
                request.result = disk.has(key) ? structuredClone(disk.get(key)) : undefined;
                request.onsuccess?.({ target: request });
                queueMicrotask(() => {
                  if (transaction.aborted) return;
                  if (abortWrites && staged.length) {
                    transaction.abort();
                    return;
                  }
                  for (const [k, v] of staged) disk.set(k, v);
                  transaction.oncomplete?.();
                });
              });
              return request;
            },
            put(value, key) {
              staged.push([key, structuredClone(value)]);
            },
          };
        },
      };
      return transaction;
    },
  };
  const indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
  return { indexedDB, disk };
}

function corruptRecord() {
  return { schema: 0, revision: 1, run: null };
}

async function openStore(seeds = {}) {
  const { indexedDB, disk } = database(seeds);
  const store = loadStore(indexedDB).create(registry);
  await store.open();
  assert.equal(store.info().mode, 'indexeddb');
  return { store, disk };
}

test('corrupt-read then explicit restore succeeds and reads back the run', async () => {
  const { store } = await openStore({ [ID]: corruptRecord() });
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  const run = registry.begin(ID);
  await store.restore(run);
  assert.deepEqual(await store.read(ID), run);
});

test('restore keeps both 5,000-action replays in the worker and snapshots its input', async () => {
  const run = registry.begin(ID);
  run.log = Array.from({ length: 5000 }, (_, i) =>
    i % 2 ? { from: 2, to: 1 } : { from: 1, to: 2 },
  );
  const original = { schema: 1, revision: 1, run: structuredClone(run) };
  const { indexedDB, disk } = database({ [ID]: original });
  let mainReplays = 0,
    workerCalls = 0;
  const store = loadStore(indexedDB, (message) => {
    workerCalls++;
    return validateImport(message);
  }).create({
    validateRun(value) {
      mainReplays++;
      return registry.validateRun(value);
    },
  });
  await store.open();
  await store.read(ID);
  mainReplays = 0;
  const restoring = store.restore(run);
  assert.equal(mainReplays, 0, 'restore must return without replaying the import');
  run.log[0] = { from: 0, to: 0 };
  await restoring;
  assert.equal(mainReplays, 0, 'the queued restore must not replay the disk record either');
  assert.equal(workerCalls, 1);
  assert.deepEqual(disk.get(ID).run, original.run);
  assert.deepEqual(disk.get(`recovery:${ID}`).record, original);
});

test('restore refuses illegal imports and worker failures without touching recovery', async () => {
  const { store, disk } = await openStore({ [ID]: validRecord() });
  const invalid = registry.begin(ID);
  invalid.log = [{ from: 0, to: 0 }];
  await assert.rejects(async () => store.restore(invalid), /Choose two different pegs/);
  assert.deepEqual(disk.get(ID), validRecord());
  assert.equal(disk.has(`recovery:${ID}`), false);
  const failed = loadStore(database().indexedDB, () =>
    Promise.reject(Error('worker deadline')),
  ).create(registry);
  await failed.open();
  await assert.rejects(failed.restore(registry.begin(ID)), /worker deadline/);
});

test('restore refuses a disk change made while the worker checks the snapshot', async () => {
  const { indexedDB, disk } = database({ [ID]: corruptRecord() });
  const raced = validRecord();
  const store = loadStore(indexedDB, async (message) => {
    const result = await validateImport(message);
    disk.set(ID, raced);
    return result;
  }).create(registry);
  await store.open();
  await assert.rejects(store.restore(registry.begin(ID)), /Another tab changed/);
  assert.deepEqual(disk.get(ID), raced);
  assert.equal(disk.has(`recovery:${ID}`), false);
});

test('restore retains the replaced bytes under the raw recovery:+id key', async () => {
  const { store, disk } = await openStore({ [ID]: corruptRecord() });
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  await store.restore(registry.begin(ID));
  const retained = disk.get(`recovery:${ID}`);
  assert.ok(retained, 'restoring path writes a recovery key');
  assert.deepEqual(retained.record, corruptRecord());
  const archive = await store.recovery(ID);
  assert.equal(archive.format, 'alibi-challenge-recovery');
  assert.equal(archive.challengeId, ID);
  assert.deepEqual(archive.recovery, retained);
  assert.throws(() => registry.validateRun(archive));
});

test('non-restore writes to a protected id stay refused', async () => {
  const { store, disk } = await openStore({ [ID]: corruptRecord() });
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  await assert.rejects(store.write(registry.begin(ID)), /protected and was preserved/);
  assert.deepEqual(disk.get(ID), corruptRecord());
  assert.equal(disk.has(`recovery:${ID}`), false);
});

test('restore in session mode still requires transactional storage', async () => {
  const store = loadStore(undefined).create(registry);
  await store.open();
  assert.equal(store.info().mode, 'session');
  await assert.rejects(store.restore(registry.begin(ID)), /transactional/);
});

function validRecord() {
  return { schema: 1, revision: 1, run: registry.begin(ID) };
}

test('restore over a valid record with a stale revision still conflicts', async () => {
  const { store, disk } = await openStore({ [ID]: validRecord() });
  // No read first: the in-memory revision map is empty, so expected is 0
  // while the stored revision is 1 — a concurrent edit must not be silently
  // replaced even by an explicit restore.
  await assert.rejects(store.restore(registry.begin(ID)), /Another tab changed/);
  assert.deepEqual(disk.get(ID), validRecord());
  assert.equal(disk.has(`recovery:${ID}`), false);
});

test('restore after a fresh read replaces and retains recovery', async () => {
  const { store, disk } = await openStore({ [ID]: validRecord() });
  await store.read(ID);
  await store.restore(registry.begin(ID));
  assert.equal(disk.get(ID).revision, 2);
  assert.deepEqual(disk.get(`recovery:${ID}`).record, validRecord());
});

test('committed restore unprotects only its challenge and later edits survive reopening', async () => {
  const other = 'curated-classic-hanoi-02';
  const { store, disk } = await openStore({ [ID]: corruptRecord(), [other]: corruptRecord() });
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  await assert.rejects(store.read(other), /unsupported and was preserved/);
  const run = registry.begin(ID);
  await store.restore(run);
  run.log.push({ from: 1, to: 2 });
  await store.write(run);
  const reopened = await openStore(Object.fromEntries(disk));
  assert.deepEqual(await reopened.store.read(ID), run);
  assert.equal(disk.get(ID).revision, 2);
  assert.deepEqual(disk.get(`recovery:${ID}`).record, corruptRecord());
  await assert.rejects(store.write(registry.begin(other)), /protected and was preserved/);
  assert.deepEqual(disk.get(other), corruptRecord());
});

test('aborted restore leaves the challenge protected and original bytes intact', async () => {
  const { indexedDB, disk } = database({ [ID]: corruptRecord() }, true);
  const store = loadStore(indexedDB).create(registry);
  await store.open();
  await assert.rejects(store.read(ID), /unsupported and was preserved/);
  await assert.rejects(store.restore(registry.begin(ID)), /storage failed/);
  await assert.rejects(store.write(registry.begin(ID)), /protected and was preserved/);
  assert.deepEqual(disk.get(ID), corruptRecord());
  assert.equal(disk.has(`recovery:${ID}`), false);
});

test('valid originals retain playable recovery while future fields remain raw and unchanged', async () => {
  const { store, disk } = await openStore({ [ID]: validRecord() });
  await store.read(ID);
  await store.restore(registry.begin(ID));
  assert.deepEqual(await store.recovery(ID), registry.begin(ID));
  const original = {
    ...validRecord(),
    schema: 2,
    unknown: { text: 'preserve 雨', flags: [false, null] },
  };
  const future = await openStore({ [ID]: original });
  await assert.rejects(future.store.read(ID));
  await future.store.restore(registry.begin(ID));
  const retained = future.disk.get(`recovery:${ID}`);
  const archive = await future.store.recovery(ID);
  assert.equal(archive.format, 'alibi-challenge-recovery');
  assert.deepEqual(archive.recovery, retained);
  assert.deepEqual(retained.record, original);
  await future.store.write(registry.begin(ID));
  assert.equal(future.disk.get(ID).revision, 2);
  assert.deepEqual(future.disk.get(`recovery:${ID}`), retained);
  assert.equal(disk.get(ID).revision, 2);
});

test('explicit restores retain falsy JSON records and expose them as raw recovery', async () => {
  for (const original of [false, 0, '', null]) {
    const { store, disk } = await openStore({ [ID]: original });
    await store.restore(registry.begin(ID));
    const archive = await store.recovery(ID);
    assert.equal(archive.format, 'alibi-challenge-recovery');
    assert.equal(archive.recovery.record, original);
    assert.deepEqual(archive.recovery, disk.get(`recovery:${ID}`));
    assert.deepEqual(await store.read(ID), registry.begin(ID));
  }
});

test('a retained run for another challenge remains a raw archive of the requested id', async () => {
  const original = { schema: 1, revision: 1, run: registry.begin('curated-classic-hanoi-02') };
  const { store } = await openStore({ [ID]: original });
  await assert.rejects(store.read(ID));
  await store.restore(registry.begin(ID));
  const archive = await store.recovery(ID);
  assert.equal(archive.format, 'alibi-challenge-recovery');
  assert.equal(archive.challengeId, ID);
  assert.deepEqual(archive.recovery.record, original);
});

test('missing recovery stays absent while opaque existing recovery rows remain exact', async () => {
  const { store, disk } = await openStore();
  assert.equal(await store.recovery(ID), null);
  for (const value of [null, false, 0, '', { future: { note: 'keep exactly' } }]) {
    disk.set(`recovery:${ID}`, value);
    const archive = await store.recovery(ID);
    assert.equal(archive.format, 'alibi-challenge-recovery');
    assert.deepEqual(archive.recovery, value);
    assert.deepEqual(disk.get(`recovery:${ID}`), value);
  }
});
