'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { reversi: R } = require('../src/club-engines.js');

function endgame() {
  let state = R.initial();
  while (!state.done && state.board.filter((value) => value === 0).length > 7) {
    state = R.move(state, R.legal(state)[0]);
  }
  return state;
}

test('Reversi uses its bounded default for fractional and non-numeric search depths', () => {
  const state = endgame();
  const before = structuredClone(state);
  const expected = R.best(state, 4);
  assert.deepEqual(expected, { cell: 28, value: 33, nodes: 213 });
  for (const depth of [2.5, NaN, Infinity, -Infinity, '2', null, {}, [2.5], true]) {
    assert.deepEqual(R.best(state, depth), expected, `invalid depth ${String(depth)}`);
    assert.deepEqual(state, before);
  }
});

test('Reversi keeps normal integer depth choices and the one-to-five clamp', () => {
  const state = endgame();
  assert.deepEqual(R.best(state), R.best(state, 4));
  assert.deepEqual(R.best(state, 0), R.best(state, 1));
  assert.deepEqual(R.best(state, -100), R.best(state, 1));
  assert.deepEqual(R.best(state, 100), R.best(state, 5));
  assert.deepEqual(R.best(state, 5), { cell: 28, value: 14, nodes: 478 });
  for (const depth of [1, 2, 3, 4, 5]) {
    assert.ok(R.legal(state).includes(R.best(state, depth).cell));
  }
});

test('finished Reversi boards do not search even with an invalid depth', () => {
  let state = endgame();
  while (!state.done) state = R.move(state, R.legal(state)[0]);
  const before = structuredClone(state);
  assert.equal(R.best(state, 2.5), null);
  assert.deepEqual(state, before);
});
