'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tictactoe } = require('../src/club-engines.js');

test('tic-tac-toe keeper blocks an immediate human win', () => {
  // X (human) holds 6 and 7 and threatens 8; O (keeper) to move must play 8.
  // The immediate block is 8; choosing any other legal square loses at once.
  const s = tictactoe.replay([6, 0, 7]);
  assert.equal(s.turn, -1);
  const before = structuredClone(s);
  const result = tictactoe.best(s, 9);
  assert.equal(result.cell, 8);
  assert.ok(result.value <= 0, `expected non-positive value for the keeper, got ${result.value}`);
  assert.deepEqual(s, before);
});
