'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { blockCabinet: E } = require('../src/club-engines.js');
function history(seed, count = 8) {
  let state = E.initial(seed);
  const log = [];
  for (let i = 0; i < count; i++) {
    const slot = [0, 1, 2].find((candidate) => E.placements(state, candidate).length);
    assert.notEqual(slot, undefined, 'the fixture needs an available placement');
    const cell = E.placements(state, slot)[0];
    log.push({ slot, cell });
    state = E.move(state, slot, cell);
  }
  return { log, state };
}
function countMoves(run) {
  const move = E.move;
  let calls = 0;
  E.move = function (...args) {
    calls++;
    return move.apply(this, args);
  };
  try {
    return run(() => calls);
  } finally {
    E.move = move;
  }
}
// Work counts are deterministic evidence, not physical-phone timing claims.
test('identical replay reads reuse work while returning independent state', () => {
  const seed = 'CACHE-IDENTICAL',
    { log, state } = history(seed);
  countMoves((count) => {
    const first = E.replay(seed, log);
    const second = E.replay(seed, structuredClone(log));
    assert.equal(count(), log.length, 'the second replay must not repeat engine moves');
    assert.deepEqual(first, state);
    assert.deepEqual(second, state);
    assert.notEqual(first, second);
    for (const key of ['board', 'tray', 'lastClear']) assert.notEqual(first[key], second[key]);
    first.board.fill(7);
    first.tray.fill('unknown');
    first.lastClear.rows.push(99);
    second.seed = 'POISON';
    assert.deepEqual(E.replay(seed, log), state, 'caller mutations cannot poison the cache');
  });
});
test('a valid appended move replays only the new suffix', () => {
  const seed = 'CACHE-APPEND',
    { log, state } = history(seed, 10);
  const prefix = log.slice(0, 8);
  countMoves((count) => {
    E.replay(seed, prefix);
    prefix.push(...log.slice(8));
    assert.deepEqual(E.replay(seed, prefix), state);
    assert.equal(count(), log.length, 'appending two moves costs two moves, not ten');
    E.replay(seed, prefix);
    assert.equal(count(), log.length);
  });
});
test('undo, redo and a different valid branch match uncached production replay', () => {
  const seed = 'CACHE-UNDO',
    { log } = history(seed, 8);
  E.replay(seed, log);
  const undone = log.slice(0, -2);
  const fresh = (actions) => actions.reduce((s, a) => E.move(s, a.slot, a.cell), E.initial(seed));
  assert.deepEqual(E.replay(seed, undone), fresh(undone));
  undone.push(log[6]);
  assert.deepEqual(E.replay(seed, undone), fresh(undone));
  const before = fresh(undone);
  const slot = [0, 1, 2].find((i) => E.placements(before, i).length);
  undone.push({ slot, cell: E.placements(before, slot).at(-1) });
  assert.deepEqual(E.replay(seed, undone), fresh(undone));
});
test('a changed middle move with identical seed, length and final move cannot hit the cache', () => {
  const seed = 'CACHE-MIDDLE',
    { log } = history(seed);
  E.replay(seed, log);
  const corrupted = structuredClone(log);
  corrupted[1] = { ...corrupted[0] };
  assert.throws(() => E.replay(seed, corrupted), /does not fit|cabinet is closed/);
  assert.deepEqual(
    E.replay(seed, log),
    history(seed).state,
    'failed replay does not replace valid state',
  );
});
for (const [name, mutate] of [
  [
    'extra move field',
    (log) => {
      log[0].unexpected = true;
    },
  ],
  [
    'sparse log',
    (log) => {
      delete log[1];
    },
  ],
  [
    'invalid slot',
    (log) => {
      log[0].slot = 3;
    },
  ],
  [
    'invalid cell',
    (log) => {
      log[0].cell = 64;
    },
  ],
  [
    'string coordinate',
    (log) => {
      log[0].cell = String(log[0].cell);
    },
  ],
]) {
  test(`cached histories still reject ${name}`, () => {
    const seed = 'CACHE-VALIDATION',
      { log } = history(seed);
    E.replay(seed, log);
    mutate(log);
    assert.throws(() => E.replay(seed, log), /Invalid Block Cabinet move/);
  });
}
test('new seed and restart do not reuse old tray, score or board', () => {
  const { log } = history('CACHE-RESET');
  E.replay('CACHE-RESET', log);
  assert.deepEqual(E.replay('OTHER-SEED', []), E.initial('OTHER-SEED'));
  assert.deepEqual(E.replay('CACHE-RESET', []), E.initial('CACHE-RESET'));
  assert.throws(() => E.replay('not a seed', []));
  assert.throws(
    () => E.replay('CACHE-RESET', Array(E.maxMoves + 1).fill({ slot: 0, cell: 0 })),
    /Invalid Block Cabinet replay/,
  );
});
test('an invalid appended move never enters the cache', () => {
  const seed = 'CACHE-BAD-SUFFIX',
    { log, state } = history(seed);
  E.replay(seed, log);
  assert.throws(
    () => E.replay(seed, [...log, { slot: 0, cell: 99 }]),
    /Invalid Block Cabinet move/,
  );
  assert.deepEqual(E.replay(seed, log), state);
});
test('many alternating histories remain deterministic without mutating input', () => {
  const fixtures = ['CACHE-A', 'CACHE-B', 'CACHE-C'].map((seed) => ({ seed, ...history(seed) }));
  const snapshot = JSON.stringify(fixtures);
  for (let i = 0; i < 12; i++)
    for (const f of fixtures) assert.deepEqual(E.replay(f.seed, f.log), f.state);
  assert.equal(JSON.stringify(fixtures), snapshot);
  assert.equal(E.maxMoves, 500, 'long-run cap qualification stays separately tracked');
});
test('real Club placement, repeated rendering and reload preserve the replay with bounded work', async () => {
  const { session } = require('./helpers/club-session.cjs');
  const tab = await session();
  await tab.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  const engine = tab.context.AlibiClubEngines.blockCabinet,
    move = engine.move;
  let calls = 0;
  engine.move = function (...args) {
    calls++;
    return move.apply(this, args);
  };
  await tab.action('block-piece', { value: '0' });
  const state = engine.replay('BLOCK-01', []),
    cell = engine.placements(state, 0)[0];
  await tab.action('block-cell', { cell: String(cell) });
  const afterMove = calls;
  for (let i = 0; i < 5; i++) tab.club.roomPage('blockcabinet');
  assert.equal(calls, afterMove, 'rendering the same real run needs no engine moves');
  assert.ok(afterMove <= 2, `${afterMove} moves instead of repeated history replay`);
  const saved = tab.state();
  assert.deepEqual(saved.runs.blockcabinet.log, [{ slot: 0, cell }]);
  const next = await session(null, tab.storage.get('alibi-afterhours-v1'));
  assert.deepEqual(next.state().runs.blockcabinet, saved.runs.blockcabinet);
});
