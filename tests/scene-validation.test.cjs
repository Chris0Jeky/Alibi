'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const C = require('../src/core.js');

const puzzle = {
  size: 4,
  people: [{ id: 'iris' }, { id: 'theo' }, { id: 'mina' }, { id: 'otto' }],
  objects: [{ cell: 5 }],
  clues: [
    { kind: 'edge', who: 'iris' },
    { kind: 'edge', who: 'theo' },
  ],
};

const act = (state, action) => C.registry.scene.reduce(puzzle, state, action);
const fresh = () => C.registry.scene.initial(puzzle);

test('malformed exclude returns the prior state unchanged', () => {
  for (const action of [
    { type: 'exclude', who: 'ghost', cell: 0 },
    { type: 'exclude', who: 'iris', cell: 5 },
    { type: 'exclude', who: 'iris', cell: 9999 },
    { type: 'exclude', who: 'iris', cell: 1.5 },
  ]) {
    const state = fresh();
    const next = act(state, action);
    assert.equal(next, state);
    assert.deepEqual(next, state);
  }
  const state = fresh();
  assert.deepEqual(state.notes, {});
});

test('malformed clue returns the prior state unchanged', () => {
  for (const action of [
    { type: 'clue', index: 9999 },
    { type: 'clue', index: -1 },
    { type: 'clue', index: 0.5 },
  ]) {
    const state = fresh();
    const next = act(state, action);
    assert.equal(next, state);
    assert.deepEqual(next, state);
  }
  const state = fresh();
  assert.deepEqual(state.clueMarks, []);
});

test('malformed accuse returns the prior state unchanged', () => {
  const state = fresh();
  const next = act(state, { type: 'accuse', who: 'ghost' });
  assert.equal(next, state);
  assert.deepEqual(next, state);
  assert.equal(state.accused, null);
});

test('malformed clear returns the prior state unchanged', () => {
  for (const action of [
    { type: 'clear', cell: 9999 },
    { type: 'clear' },
    { type: 'clear', cell: 3 },
  ]) {
    const state = fresh();
    const next = act(state, action);
    assert.equal(next, state);
    assert.deepEqual(next, state);
  }
});

test('valid exclude/clue/accuse/clear still apply', () => {
  let state = fresh();
  state = act(state, { type: 'exclude', who: 'iris', cell: 1 });
  assert.deepEqual(state.notes.iris, [1]);
  state = act(state, { type: 'clue', index: 0 });
  assert.deepEqual(state.clueMarks, [0]);
  state = act(state, { type: 'accuse', who: 'iris' });
  assert.equal(state.accused, 'iris');
  state = act(state, { type: 'place', who: 'theo', cell: 2 });
  assert.equal(state.placements.theo, 2);
  state = act(state, { type: 'clear', cell: 2 });
  assert.equal(state.placements.theo, undefined);
});
