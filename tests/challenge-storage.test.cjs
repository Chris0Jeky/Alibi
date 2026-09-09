'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Q = require('../src/quiet-wing/engine.js');
const E = require('../src/club-engines.js');
const Challenges = require('../src/challenges.js');
const Store = require('../src/challenge-storage.js');
const raw = ['classics', 'warehouse', 'reversi', 'borough'].flatMap(
  (n) => JSON.parse(fs.readFileSync(`content/challenges/${n}.json`)).challenges,
);

function storageContext(indexedDB, timers = {}) {
  const context = {
    clearTimeout: timers.clearTimeout || clearTimeout,
    console,
    indexedDB,
    JSON,
    Map,
    module: { exports: {} },
    setTimeout: timers.setTimeout || setTimeout,
    structuredClone,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/challenge-storage.js'), 'utf8'), context);
  return context.module.exports;
}

function registry() {
  return {
    validateRun(run) {
      if (!run || typeof run.challengeId !== 'string') throw Error('invalid run');
      return structuredClone(run);
    },
  };
}

test('reopening a challenge reads the latest queued replay before another move', async () => {
  const registry = Challenges.create(raw, { quiet: Q, club: E });
  const store = Store.create(registry);
  await store.open();
  const first = registry.begin('curated-classic-hanoi-01');
  first.log.push({ from: 1, to: 2 });
  const second = structuredClone(first);
  second.log.push({ from: 0, to: 1 });
  const writes = [store.write(first), store.write(second)];
  const reopened = await store.read(first.challengeId);
  await Promise.all(writes);
  assert.deepEqual(reopened, second);
});
test('session fallback saves only validated replay records without affecting legacy state', async () => {
  const registry = Challenges.create(raw, { quiet: Q, club: E });
  const store = Store.create(registry);
  await store.open();
  const run = registry.begin('curated-classic-hanoi-01');
  run.log.push({ from: 1, to: 2 });
  await store.write(run);
  assert.deepEqual(await store.read(run.challengeId), run);
  const next = structuredClone(run);
  next.log.push({ from: 0, to: 1 });
  await store.write(next);
  assert.equal((await store.read(next.challengeId)).log.length, 2);
  await assert.rejects(store.restore(registry.begin(next.challengeId)), /transactional/);
  assert.equal((await store.read(next.challengeId)).log.length, 2);
  run.startingStateHash = 'changed';
  assert.throws(() => store.write(run), /trusted definition/);
  const legacy = Q.classicInitial('hanoi3');
  assert.equal(Q.classicMove(legacy, { from: 0, to: 2 }).state.moves, 1);
});

test('explicitly unavailable IndexedDB uses the retained session store', async () => {
  for (const name of ['SecurityError', 'NotSupportedError']) {
    const ChallengesWithUnavailableStorage = storageContext({
      open() {
        throw Object.assign(Error('restricted storage'), { name });
      },
    });
    const store = ChallengesWithUnavailableStorage.create(registry()),
      run = { challengeId: 'restricted-' + name };
    const info = await store.open();
    assert.equal(info.mode, 'session');
    assert.equal(info.protected, false);
    await store.write(run);
    assert.deepEqual(await store.read(run.challengeId), run);
  }
});

test('ambiguous open failures stay protected and late successes are closed after timeout', async () => {
  const ambiguous = storageContext({
    open() {
      throw Error('unknown open failure');
    },
  });
  const protectedStore = ambiguous.create(registry());
  const ambiguousInfo = await protectedStore.open();
  assert.equal(ambiguousInfo.mode, 'session');
  assert.equal(ambiguousInfo.protected, true);
  await assert.rejects(protectedStore.write({ challengeId: 'ambiguous' }), /protected/);

  let expire,
    aborted = 0,
    closed = 0;
  const request = {},
    delayed = storageContext(
      {
        open() {
          return request;
        },
      },
      {
        setTimeout(fn) {
          expire = fn;
          return 1;
        },
        clearTimeout() {},
      },
    );
  const store = delayed.create(registry()),
    pending = store.open();
  expire();
  const delayedInfo = await pending;
  assert.equal(delayedInfo.mode, 'session');
  assert.equal(delayedInfo.protected, true);
  request.transaction = { abort: () => aborted++ };
  request.onupgradeneeded();
  request.result = { close: () => closed++ };
  request.onsuccess();
  assert.equal(aborted, 1, 'late upgrade is aborted');
  assert.equal(closed, 1, 'late open success is closed');
  const remountInfo = await store.open();
  assert.equal(remountInfo.mode, 'session');
  assert.equal(remountInfo.protected, true);
});
