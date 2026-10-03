'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { blockCabinet: E } = require('../src/club-engines.js');
const fixture = require('./fixtures/block-replay-long.json');
const log = fixture.moves.map(([slot, cell]) => ({ slot, cell }));
const expected = () =>
  log.reduce((state, action) => E.move(state, action.slot, action.cell), E.initial(fixture.seed));

test('the fixed 268-move history matches an uncached fold and remains below the unchanged cap', () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(log.length, 268);
  assert.equal(E.maxMoves, 500);
  const source = JSON.stringify(fixture);
  assert.deepEqual(E.replay(fixture.seed, log), expected());
  assert.equal(JSON.stringify(fixture), source);
});
test('twenty long replay reads evaluate the history once, not twenty times', () => {
  const answer = expected();
  E.replay('EVICT-LONG', []);
  const original = E.move;
  let calls = 0;
  E.move = function (...args) {
    calls++;
    return original.apply(this, args);
  };
  try {
    for (let i = 0; i < 20; i++)
      assert.deepEqual(E.replay(fixture.seed, structuredClone(log)), answer);
    assert.equal(calls, 268, '20 reads must not execute 5360 rule moves');
  } finally {
    E.move = original;
  }
});
test('sequential long-game growth evaluates each newly appended move only once', () => {
  E.replay('EVICT-APPEND', []);
  const original = E.move;
  let calls = 0;
  E.move = function (...args) {
    calls++;
    return original.apply(this, args);
  };
  try {
    for (let length = 0; length <= log.length; length++)
      E.replay(fixture.seed, log.slice(0, length));
    assert.equal(calls, log.length, 'prefix growth must not evaluate the triangular history total');
  } finally {
    E.move = original;
  }
  assert.deepEqual(E.replay(fixture.seed, log), expected());
});
test('late historical corruption still fails and does not poison the valid long replay', () => {
  const answer = expected();
  E.replay(fixture.seed, log);
  const corrupted = structuredClone(log);
  corrupted[200] = { ...corrupted[199] };
  assert.throws(() => E.replay(fixture.seed, corrupted), /does not fit|cabinet is closed/);
  assert.deepEqual(E.replay(fixture.seed, log), answer);
});
