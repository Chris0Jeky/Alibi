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
  const original = E.move;
  let calls = 0;
  E.move = function (...args) {
    calls++;
    return original.apply(this, args);
  };
  try {
    assert.throws(() => E.replay(fixture.seed, corrupted), /does not fit|cabinet is closed/);
    assert.ok(calls > 0, 'the legal prefix was evaluated before discovering corruption');
    calls = 0;
    assert.deepEqual(E.replay(fixture.seed, log), answer);
    assert.equal(calls, 0, 'the prior valid cache must survive, not be recomputed');
  } finally {
    E.move = original;
  }
});

test('Club restores a long terminal replay and preserves undo and redo across reload', async () => {
  const { session, fresh } = require('./helpers/club-session.cjs');
  const data = fresh();
  data.runs.blockcabinet = { seed: fixture.seed, log: structuredClone(log), redo: [] };
  let engine;
  let moveCalls = 0;
  const observe = (context) => {
    engine = context.AlibiClubEngines.blockCabinet;
    const move = engine.move;
    engine.move = function (...args) {
      moveCalls++;
      return move.apply(this, args);
    };
  };

  const first = await session(data, null, { beforeInit: observe });
  assert.equal(moveCalls, log.length, 'cold Club validation replays every move once');
  await first.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  let page = first.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>268<\/strong>/);
  assert.match(page, /<strong>Cabinet closed\.<\/strong>/);
  assert.equal(moveCalls, log.length, 'the room reuses validation’s warm replay');

  await first.action('undo', { id: 'blockcabinet' });
  assert.deepEqual(first.state().runs.blockcabinet.log, log.slice(0, -1));
  assert.deepEqual(first.state().runs.blockcabinet.redo, [log.at(-1)]);
  page = first.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>267<\/strong>/);
  assert.doesNotMatch(page, /<strong>Cabinet closed\.<\/strong>/);
  const undoReplayWork = moveCalls - log.length;
  assert.ok(
    undoReplayWork > 0 && undoReplayWork <= 64,
    `undo replays only the suffix after a nearby checkpoint (${undoReplayWork} moves)`,
  );
  const afterUndo = first.storage.get('alibi-afterhours-v1');
  assert.deepEqual(JSON.parse(afterUndo).data.runs.blockcabinet.log, log.slice(0, -1));
  assert.deepEqual(JSON.parse(afterUndo).data.runs.blockcabinet.redo, [log.at(-1)]);

  moveCalls = 0;
  const restored = await session(null, afterUndo, { beforeInit: observe });
  assert.equal(moveCalls, log.length, 'cold reload validates the full log plus redo continuation');
  await restored.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  page = restored.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>267<\/strong>/);
  assert.doesNotMatch(page, /<strong>Cabinet closed\.<\/strong>/);
  const restoredUndoReplayWork = moveCalls - log.length;
  assert.ok(
    restoredUndoReplayWork > 0 && restoredUndoReplayWork <= 64,
    `the restored shorter active log replays only its checkpoint suffix (${restoredUndoReplayWork} moves)`,
  );

  await restored.action('redo', { id: 'blockcabinet' });
  assert.deepEqual(restored.state().runs.blockcabinet.log, log);
  assert.deepEqual(restored.state().runs.blockcabinet.redo, []);
  page = restored.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>268<\/strong>/);
  assert.match(page, /<strong>Cabinet closed\.<\/strong>/);
  assert.equal(
    moveCalls,
    log.length + restoredUndoReplayWork + 1,
    'redo extends the warmed 267-move cache by exactly the saved final move',
  );
});
