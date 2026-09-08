'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ctx = { structuredClone, console };
vm.createContext(ctx);
for (const file of ['core.js', 'engines.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), ctx);
const C = ctx.AlibiCore;
const puzzles = require('../content/catalog.json').puzzles;

test('scene imports reject impossible occupancy but preserve ordinary player mistakes', () => {
  const p = puzzles.find((p) => p.type === 'scene'),
    initial = () => C.registry.scene.initial(p);
  const available = C.range(p.size ** 2).filter((i) => !p.objects.some((o) => o.cell === i));
  const duplicate = initial();
  duplicate.placements[p.people[0].id] = available[0];
  duplicate.placements[p.people[1].id] = available[0];
  assert.throws(() => C.validateState(p, duplicate), /Invalid scene save/);
  const blocked = initial();
  blocked.placements[p.people[0].id] = p.objects[0].cell;
  assert.throws(() => C.validateState(p, blocked), /Invalid scene save/);
  const conflict = initial();
  const pair = available.flatMap((a) =>
    available
      .filter((b) => b > a && Math.floor(a / p.size) === Math.floor(b / p.size))
      .map((b) => [a, b]),
  )[0];
  conflict.placements[p.people[0].id] = pair[0];
  conflict.placements[p.people[1].id] = pair[1];
  assert.doesNotThrow(() => C.validateState(p, conflict));
});

test('unused notes cannot smuggle malformed values into extra-family saves', () => {
  for (const type of ['dossier', 'witness', 'lightup', 'tents', 'aquarium', 'network', 'trail']) {
    const p = puzzles.find((p) => p.type === type),
      s = C.registry[type].initial(p);
    assert.doesNotThrow(() => C.validateState(p, s));
    s.notes = { 0: { junk: true } };
    assert.throws(() => C.validateState(p, s), /Invalid puzzle state/);
  }
  const p = puzzles.find((p) => p.type === 'futoshiki');
  const blank = p.givens.findIndex((v) => v === 0);
  const s = C.registry.futoshiki.reduce(p, C.registry.futoshiki.initial(p), {
    type: 'set',
    cell: blank,
    value: 1,
    pencil: true,
  });
  assert.doesNotThrow(() => C.validateState(p, s), 'legitimate number pencil notes stay valid');
});

test('workshop recovery validates shape without discarding unfinished edits', () => {
  const p = structuredClone(puzzles.find((p) => p.type === 'scene'));
  p.title = '';
  p.clues = [];
  p.objects = [];
  p.rooms.fill(0);
  assert.doesNotThrow(() => C.validateSceneDraft(p));
  assert.throws(
    () => C.validateSceneDraft({ type: 'scene', people: null }),
    /draft needs attention/,
  );
  p.people[0] = null;
  assert.throws(() => C.validateSceneDraft(p), /draft needs attention/);
});

test('blocked IndexedDB stops without creating a competing fallback or leaking a late connection', async () => {
  const writes = [],
    request = {},
    closed = [];
  const context = {
    setTimeout,
    clearTimeout,
    structuredClone,
    Event,
    console,
    dispatchEvent() {},
    indexedDB: {
      open() {
        queueMicrotask(() => request.onblocked());
        return request;
      },
    },
    localStorage: {
      setItem(...args) {
        writes.push(args);
      },
      removeItem() {},
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8'), context);
  const s = await new context.AlibiStorage.Store().init();
  assert.equal(s.fatal, true);
  assert.equal(s.db, null);
  assert.equal(writes.length, 0);
  assert.match(s.problem, /another Alibi tab/);
  request.result = {
    close() {
      closed.push(true);
    },
  };
  request.onsuccess();
  assert.equal(closed.length, 1);
});

test('silent IndexedDB open times out without fallback writes and closes a late connection', async () => {
  let expire,
    closed = 0,
    writes = 0;
  const request = {};
  const context = {
    setTimeout(fn) {
      expire = fn;
      return 1;
    },
    clearTimeout() {},
    indexedDB: {
      open() {
        return request;
      },
    },
    localStorage: {
      setItem() {
        writes++;
      },
      removeItem() {},
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8'), context);
  const pending = new context.AlibiStorage.Store().init();
  expire();
  const store = await pending;
  assert.equal(store.fatal, true);
  assert.equal(writes, 0);
  assert.match(store.problem, /timed out/);
  request.result = {
    close() {
      closed++;
    },
  };
  request.onsuccess();
  assert.equal(closed, 1);
});
