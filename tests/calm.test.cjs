'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict');
const C = require('../src/quiet-wing/calm.js');
const E = require('../src/quiet-wing/engine.js');
test('only named game IDs can enter the new replay rules', () => {
  for (const id of ['constructor', '__proto__', 'toString', 'missing']) {
    assert.throws(() => C.initial(id), /Unknown/);
    assert.throws(() => E.classicInitial(id), /Unknown/);
  }
});
test('both pouring boards solve legally within the fixed search budget', () => {
  for (const id of ['tideglass-morning', 'tideglass-dusk']) {
    let state = C.initial(id);
    const original = structuredClone(state),
      result = C.solve(state);
    assert.ok(result.actions?.length > 0);
    assert.ok(result.visited <= 12000);
    assert.deepEqual(state, original);
    for (const action of result.actions) {
      const before = structuredClone(state),
        next = C.move(state, action);
      assert.ok(!next.error);
      assert.deepEqual(state, before);
      assert.deepEqual(next.state.jars.flat().sort(), before.jars.flat().sort());
      assert.ok(next.state.jars.every((j) => j.length <= state.capacity));
      state = next.state;
    }
    assert.ok(C.won(state));
  }
});
test('pouring refuses incompatible symbols, empty sources, full destinations and malformed actions atomically', () => {
  const state = C.initial('tideglass-morning'),
    before = structuredClone(state);
  for (const action of [
    null,
    { from: 0, to: 1 },
    { from: 3, to: 4 },
    { from: 0, to: 0 },
    { from: -1, to: 4 },
    { from: 0, to: 8 },
  ])
    assert.ok(C.move(state, action).error);
  assert.deepEqual(state, before);
  assert.equal(C.solve(state, 1).limited, true);
});
test('pair boards are deterministic, mismatches remain visible until the next pick, and all pairs complete', () => {
  for (const id of ['pairs-meadow', 'pairs-shore']) {
    let state = C.initial(id);
    assert.deepEqual(state, C.initial(id));
    const a = 0,
      b = state.cards.findIndex((v) => v !== state.cards[a]);
    state = C.move(state, { cell: a }).state;
    state = C.move(state, { cell: b }).state;
    assert.deepEqual(state.open, [a, b]);
    assert.equal(state.matched.length, 0);
    const second = state.cards.findIndex((v, i) => v === state.cards[a] && i !== a);
    state = C.move(state, { cell: a }).state;
    assert.deepEqual(state.open, [a]);
    state = C.move(state, { cell: second }).state;
    assert.equal(state.matched.length, 2);
    for (let value = 0; value < 8; value++) {
      const indexes = state.cards.flatMap((v, i) =>
        v === value && !state.matched.includes(i) ? [i] : [],
      );
      for (const cell of indexes) state = C.move(state, { cell }).state;
    }
    assert.ok(C.won(state));
    assert.ok(C.move(state, { cell: 0 }).error);
  }
});
test('new games replay through existing saves without changing old game progress', () => {
  const state = E.newState(1234),
    old = E.classicInitial('hanoi3');
  state.classics.hanoi3 = { actions: [], state: old };
  for (const id of Object.keys(C.definitions)) {
    const initial = E.classicInitial(id),
      action = id.startsWith('pairs') ? { cell: 0 } : { from: 0, to: 4 };
    const next = E.classicMove(initial, action);
    assert.ok(!next.error);
    state.classics[id] = { actions: [action], state: next.state };
  }
  const restored = E.validateState(state);
  assert.deepEqual(restored.classics, state.classics);
  assert.deepEqual(restored.pets, state.pets);
  assert.equal(restored.schema, 1);
});
