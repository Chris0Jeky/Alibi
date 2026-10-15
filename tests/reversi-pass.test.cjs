'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { reversi: R } = require('../src/club-engines.js');

test('double pass on the last legal move ends the match', () => {
  const board = Array(36).fill(1);
  board[34] = -1;
  board[35] = 0;
  const s = { board, turn: 1, ply: 31, passed: 0, done: false };
  assert.deepEqual(R.legal(s), [35]);
  const before = structuredClone(s);
  const q = R.move(s, 35);
  assert.deepEqual(s, before, 'Reversi move does not mutate its input');
  assert.equal(q.done, true, 'second pass with no reply ends the match');
  assert.equal(q.turn, 0, 'finished match leaves no player to move');
  assert.deepEqual(R.legal(q), []);
  assert.deepEqual(R.legal(q, 1), []);
  assert.deepEqual(R.legal(q, -1), []);
});
