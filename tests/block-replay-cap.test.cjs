'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { blockCabinet: E } = require('../src/club-engines.js');
const fixture = require('./fixtures/block-replay-cap.json');
const log = fixture.moves.map(([slot, cell]) => ({ slot, cell }));
const expected = () =>
  log.reduce((state, action) => E.move(state, action.slot, action.cell), E.initial(fixture.seed));

test('the exact-cap fixture is a legal, nonterminal 500-move replay', () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(log.length, 500);
  assert.equal(E.maxMoves, 500);
  E.replay('EVICT-CAP-FIXTURE', []);
  const move = E.move;
  let calls = 0;
  const reference = expected();
  E.move = function (...args) {
    calls++;
    return move.apply(this, args);
  };
  try {
    const answer = E.replay(fixture.seed, log);
    assert.deepEqual(answer, reference);
    assert.equal(answer.turn, 500);
    assert.equal(answer.done, false);
    assert.equal(calls, 500, 'cold exact-cap replay evaluates each legal transition once');
    assert.deepEqual(E.replay(fixture.seed, structuredClone(log)), answer);
    assert.equal(calls, 500, 'a repeated exact-cap read reuses the cached result');
  } finally {
    E.move = move;
  }
});

test('Club restores an exact-cap replay and preserves undo and redo across reload', async () => {
  const { session, fresh } = require('./helpers/club-session.cjs');
  const data = fresh();
  data.runs.blockcabinet = { seed: fixture.seed, log: structuredClone(log), redo: [] };
  let moveCalls = 0;
  const observe = (context) => {
    const engine = context.AlibiClubEngines.blockCabinet;
    const move = engine.move;
    engine.move = function (...args) {
      moveCalls++;
      return move.apply(this, args);
    };
  };

  const first = await session(data, null, { beforeInit: observe });
  assert.equal(moveCalls, 500, 'cold Club validation replays all 500 moves once');
  await first.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  let page = first.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>500<\/strong>/);
  assert.doesNotMatch(page, /<strong>Cabinet closed\.<\/strong>/);
  assert.equal(moveCalls, 500, 'the room reuses the warm exact-cap replay');

  await first.action('undo', { id: 'blockcabinet' });
  assert.deepEqual(first.state().runs.blockcabinet.log, log.slice(0, -1));
  assert.deepEqual(first.state().runs.blockcabinet.redo, [log.at(-1)]);
  page = first.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>499<\/strong>/);
  assert.doesNotMatch(page, /<strong>Cabinet closed\.<\/strong>/);
  assert.equal(moveCalls, 999, 'undo rebuilds the 499-move active prefix after the full replay');
  const afterUndo = first.storage.get('alibi-afterhours-v1');
  assert.deepEqual(JSON.parse(afterUndo).data.runs.blockcabinet.log, log.slice(0, -1));
  assert.deepEqual(JSON.parse(afterUndo).data.runs.blockcabinet.redo, [log.at(-1)]);

  moveCalls = 0;
  const restored = await session(null, afterUndo, { beforeInit: observe });
  assert.equal(moveCalls, 500, 'cold reload validates the log and its one-move redo continuation');
  await restored.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  page = restored.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>499<\/strong>/);
  assert.doesNotMatch(page, /<strong>Cabinet closed\.<\/strong>/);
  assert.equal(moveCalls, 999, 'the active 499-move prefix is rebuilt once after validation');

  await restored.action('redo', { id: 'blockcabinet' });
  assert.deepEqual(restored.state().runs.blockcabinet.log, log);
  assert.deepEqual(restored.state().runs.blockcabinet.redo, []);
  page = restored.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>500<\/strong>/);
  assert.doesNotMatch(page, /<strong>Cabinet closed\.<\/strong>/);
  assert.equal(moveCalls, 1000, 'redo extends the warmed prefix by one transition');

  const afterRedo = restored.storage.get('alibi-afterhours-v1');
  const savedAtCap = JSON.parse(afterRedo).data.runs.blockcabinet;
  assert.deepEqual(savedAtCap.log, log);
  assert.deepEqual(savedAtCap.redo, []);
  moveCalls = 0;
  const capped = await session(null, afterRedo, { beforeInit: observe });
  assert.equal(moveCalls, 500, 'a fresh session validates the actual save written at the cap');
  await capped.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  page = capped.club.roomPage('blockcabinet');
  assert.match(page, /TURN <strong>500<\/strong>/);
  assert.doesNotMatch(page, /<strong>Cabinet closed\.<\/strong>/);
  assert.equal(moveCalls, 500, 'opening the restored exact-cap run reuses its validated cache');
});
