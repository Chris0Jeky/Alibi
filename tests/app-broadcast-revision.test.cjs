'use strict';
// Alibi #601: a stale Cabinet broadcast must not advance the active puzzle's
// expected (CAS) revision after the asynchronous storage read completes.
//
// The fixture below executes the actual BroadcastChannel handler and the
// actual enqueueSave code extracted from src/app.js inside a small VM
// sandbox; it never copies their implementation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');

const enqueueStart = appSrc.indexOf('function enqueueSave()');
const enqueueEnd = appSrc.indexOf('function savePreferences()', enqueueStart);
assert.ok(enqueueStart > 0 && enqueueEnd > enqueueStart, 'actual enqueueSave source is present');
const enqueueSrc = appSrc.slice(enqueueStart, enqueueEnd);
assert.match(enqueueSrc, /store\.saveRun/, 'extracted enqueueSave performs the CAS save');

const channelStart = appSrc.indexOf('const channel =');
const channelEnd = appSrc.indexOf('function difficulty', channelStart);
assert.ok(channelStart > 0 && channelEnd > channelStart, 'actual broadcast handler is present');
const channelSrc = appSrc.slice(channelStart, channelEnd);
assert.match(channelSrc, /store\.get\('runs'/, 'extracted handler performs the storage read');

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function runRow(key, rev, marker, moves = 0) {
  const [id, revision] = key.split('@');
  return {
    schemaVersion: 1,
    key,
    rev,
    puzzle: { id, revision: Number(revision) },
    state: { marker },
    moves,
    hints: 0,
    elapsed: 0,
    note: '',
    undo: [],
    redo: [],
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function makeWorld({ localRows, activeKey = null, storedRows = {}, holdGet = false }) {
  const counters = { get: 0, save: 0, render: 0, posted: 0 };
  const listeners = [];
  const pending = [];
  const stored = new Map(Object.entries(storedRows).map(([key, row]) => [key, clone(row)]));
  const store = {
    mode: 'indexeddb',
    get(table, key) {
      counters.get++;
      if (holdGet)
        return new Promise((resolve) => pending.push(() => resolve(clone(stored.get(key)))));
      return Promise.resolve(clone(stored.get(key)));
    },
    async saveRun(snapshot, expected) {
      counters.save++;
      const snap = clone(snapshot);
      const current = stored.get(snap.key);
      const currentRev = current ? current.rev : 0;
      if (expected !== currentRev) {
        const error = Error(`CAS conflict: expected ${expected}, stored ${currentRev}.`);
        error.name = 'ConflictError';
        throw error;
      }
      const next = { ...snap, rev: currentRev + 1, updatedAt: '2026-10-11T00:00:00.000Z' };
      stored.set(snap.key, next);
      return clone(next);
    },
  };
  class FakeBroadcastChannel {
    addEventListener(type, fn) {
      if (type === 'message') listeners.push(fn);
    }
    postMessage() {
      counters.posted++;
    }
  }
  const context = {
    BroadcastChannel: FakeBroadcastChannel,
    C: { clone },
    store,
    validateRun(run) {
      if (
        !run ||
        run.schemaVersion !== 1 ||
        typeof run.key !== 'string' ||
        !Number.isSafeInteger(run.rev) ||
        run.rev < 0
      )
        throw Error('Unsupported saved-game format.');
      return run;
    },
    render() {
      counters.render++;
    },
    toast() {},
    setSaveLabel() {},
    $: () => null,
    console,
    __seed: {
      records: Object.entries(localRows),
      revs: Object.entries(localRows).map(([key, row]) => [key, row.rev]),
      activeKey,
    },
  };
  vm.createContext(context);
  const setup =
    'let current = null;\n' +
    "let saveError = '';\n" +
    "let storageFatal = '';\n" +
    'let queue = Promise.resolve();\n' +
    'let pendingSaves = 0;\n' +
    'let sessionSeconds = 0;\n' +
    'let records = new Map();\n' +
    'let revs = new Map();\n' +
    'let acked = new Map();\n' +
    'for (const [k, v] of __seed.records) records.set(k, JSON.parse(JSON.stringify(v)));\n' +
    'for (const [k, v] of __seed.revs) revs.set(k, v);\n' +
    'if (__seed.activeKey) current = records.get(__seed.activeKey) || null;\n' +
    enqueueSrc +
    '\n' +
    channelSrc +
    '\n' +
    'globalThis.__recRev = (key) => records.get(key)?.rev;\n' +
    'globalThis.__marker = (key) => records.get(key)?.state?.marker;\n' +
    'globalThis.__expected = (key) => revs.get(key);\n' +
    'globalThis.__currentKey = () => current?.key;\n' +
    'globalThis.__saveError = () => saveError;\n' +
    'globalThis.__activate = (key) => { current = records.get(key) || null; };\n' +
    'globalThis.__enqueue = () => { enqueueSave(); };\n' +
    'globalThis.__drain = async () => { await queue; await queue; };\n';
  vm.runInContext(setup, context, { filename: 'app-broadcast-fixture.vm.cjs' });
  assert.equal(listeners.length, 1, 'actual handler subscribed exactly once');
  return {
    context,
    counters,
    stored,
    pending,
    fireSaved: (key, rev) => listeners[0]({ data: { type: 'saved', key, rev } }),
    releaseNext() {
      const next = pending.shift();
      assert.ok(next, 'a storage read is pending');
      next();
    },
    recRev: (key) => context.__recRev(key),
    marker: (key) => context.__marker(key),
    expected: (key) => context.__expected(key),
    currentKey: () => context.__currentKey(),
    saveError: () => context.__saveError(),
    activate: (key) => context.__activate(key),
    enqueue: () => context.__enqueue(),
    drain: () => context.__drain(),
  };
}

test('a stale broadcast for the active puzzle never advances its expected revision', async () => {
  const key = 'fixture@1';
  const world = makeWorld({
    localRows: { [key]: runRow(key, 1, 'local-edits', 3) },
    activeKey: key,
    storedRows: { [key]: runRow(key, 3, 'other-tab', 9) },
    holdGet: true,
  });
  const read = world.fireSaved(key, 1);
  assert.equal(world.counters.get, 1, 'stale notification still performs the storage read');
  assert.equal(world.pending.length, 1, 'storage read is held pending');
  world.releaseNext();
  await read;
  assert.equal(world.recRev(key), 1, 'active record revision is preserved');
  assert.equal(world.marker(key), 'local-edits', 'active edited state is preserved');
  assert.equal(world.expected(key), 1, 'expected CAS revision is not advanced');
  assert.match(world.saveError(), /another tab/, 'conflict is surfaced');
  world.enqueue();
  await world.drain();
  assert.equal(world.counters.save, 0, 'conflicted session attempts no overwriting write');
  assert.equal(world.stored.get(key).rev, 3, 'stored revision is not overwritten');
  assert.equal(world.stored.get(key).state.marker, 'other-tab', 'other tab content is intact');
  assert.equal(world.expected(key), 1, 'expected revision stays stale-safe after the save');
  assert.match(world.saveError(), /another tab/, 'conflict is still surfaced');
});

test('a key that becomes active while its read is pending keeps its local snapshot', async () => {
  const alpha = 'alpha@1';
  const beta = 'beta@1';
  const world = makeWorld({
    localRows: { [alpha]: runRow(alpha, 1, 'alpha-local'), [beta]: runRow(beta, 1, 'beta-local') },
    activeKey: alpha,
    storedRows: { [beta]: runRow(beta, 4, 'beta-other') },
    holdGet: true,
  });
  const read = world.fireSaved(beta, 1);
  assert.equal(world.counters.get, 1, 'non-active notification starts a storage read');
  world.activate(beta);
  assert.equal(world.currentKey(), beta, 'navigation completes before the read resolves');
  world.releaseNext();
  await read;
  assert.equal(world.recRev(beta), 1, 'newly active record revision is preserved');
  assert.equal(world.marker(beta), 'beta-local', 'newly active edited state is preserved');
  assert.equal(world.expected(beta), 1, 'newly active expected revision is not advanced');
  assert.match(world.saveError(), /another tab/, 'conflict is surfaced');
});

test('equal or older stored rows for the active puzzle do not replace local state', async () => {
  const key = 'fixture@1';
  const world = makeWorld({
    localRows: { [key]: runRow(key, 5, 'local-edits', 7) },
    activeKey: key,
    storedRows: { [key]: runRow(key, 5, 'other-tab', 2) },
  });
  await world.fireSaved(key, 5);
  assert.equal(world.recRev(key), 5, 'active record revision is preserved');
  assert.equal(world.marker(key), 'local-edits', 'equal stored row does not replace local state');
  assert.equal(world.expected(key), 5, 'expected revision is unchanged');
  assert.equal(world.saveError(), '', 'equal rows surface no conflict');
  world.stored.set(key, runRow(key, 3, 'older-tab', 1));
  const rendersBefore = world.counters.render;
  await world.fireSaved(key, 5);
  assert.equal(world.marker(key), 'local-edits', 'older stored row does not replace local state');
  assert.equal(world.expected(key), 5, 'expected revision is unchanged by older rows');
  assert.equal(world.saveError(), '', 'older rows surface no conflict');
  assert.equal(world.counters.render, rendersBefore, 'older rows trigger no render');
});

test('other puzzles still refresh and newer notifications still short-circuit', async () => {
  const alpha = 'alpha@1';
  const beta = 'beta@1';
  const world = makeWorld({
    localRows: {
      [alpha]: runRow(alpha, 1, 'alpha-local'),
      [beta]: runRow(beta, 1, 'beta-local'),
    },
    activeKey: alpha,
    storedRows: { [beta]: runRow(beta, 2, 'beta-newer') },
  });
  await world.fireSaved(beta, 2);
  assert.equal(world.recRev(beta), 2, 'non-active record refreshes');
  assert.equal(world.expected(beta), 2, 'non-active expected revision refreshes');
  assert.equal(world.saveError(), '', 'non-active refresh surfaces no conflict');
  assert.equal(world.counters.render, 0, 'no render while a puzzle is active');
  const getsBefore = world.counters.get;
  await world.fireSaved(alpha, 9);
  assert.match(world.saveError(), /another tab/, 'higher notification surfaces the conflict');
  assert.equal(world.counters.get, getsBefore, 'higher notification never reads storage');
  assert.equal(world.counters.render, 1, 'higher notification renders once');
  assert.equal(world.expected(alpha), 1, 'expected revision is untouched by the short-circuit');
  assert.equal(world.marker(alpha), 'alpha-local', 'local state is untouched by the short-circuit');
});

test('a broadcast with no active puzzle still refreshes and renders', async () => {
  const beta = 'beta@1';
  const world = makeWorld({
    localRows: {},
    activeKey: null,
    storedRows: { [beta]: runRow(beta, 2, 'beta-newer') },
  });
  await world.fireSaved(beta, 1);
  assert.equal(world.recRev(beta), 2, 'stored row is adopted without an active puzzle');
  assert.equal(world.expected(beta), 2, 'expected revision tracks the stored row');
  assert.equal(world.saveError(), '', 'no conflict without an active puzzle');
  assert.equal(world.counters.render, 1, 'no-current refresh renders');
});
