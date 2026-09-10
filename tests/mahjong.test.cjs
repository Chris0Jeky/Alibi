'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../src/club-engines.js');
require('../src/core.js');
const C = require('../src/bridges.js');
require('../src/backup-validation.js');

const mahjong = E.mahjong;
const validator = AlibiBackupValidation(C, null, () => E, 4);
const solution = [
  [18, 19],
  [14, 17],
  [15, 16],
  [8, 13],
  [9, 12],
  [10, 11],
  [0, 7],
  [1, 6],
  [2, 5],
  [3, 4],
];

test('Mahjong deals deterministic paired layers with the expected free-pair rules', () => {
  const first = mahjong.initial('TABLE-1');
  assert.deepEqual(first, mahjong.initial('TABLE-1'));
  assert.equal(first.tiles.length, 20);
  assert.equal(mahjong.free(first, 18), true, 'top left tile is free on its open side');
  assert.equal(mahjong.free(first, 19), true, 'top right tile is free on its open side');
  assert.equal(mahjong.free(first, 15), false, 'a tile with another tile above is blocked');
  assert.equal(mahjong.free(first, 0), true, 'an edge tile with one open side is free');

  const afterTop = mahjong.move(first, 18, 19);
  assert.equal(mahjong.free(afterTop, 15), false, 'both horizontal sides can still be closed');
  const afterOuter = mahjong.move(afterTop, 14, 17);
  assert.equal(mahjong.free(afterOuter, 15), true, 'one open horizontal side frees a tile');
  assert.equal(mahjong.matching(afterOuter, 15, 16), true, 'the exposed pair matches');
  assert.deepEqual(
    first.tiles.map((tile) => tile.removed),
    Array(20).fill(false),
  );
});

test('Mahjong constructive deal can be cleared and replayed exactly', () => {
  for (const seed of ['TABLE-1', 'TABLE-2', 'NIGHT']) {
    let state = mahjong.initial(seed);
    for (const [a, b] of solution) {
      assert.equal(mahjong.matching(state, a, b), true, `${seed} keeps solution pair ${a}/${b}`);
      state = mahjong.move(state, a, b);
    }
    assert.equal(state.won, true);
    assert.equal(state.done, true);
    assert.equal(state.pairs, mahjong.pairCount);
    assert.equal(state.score, mahjong.pairCount * 10);
    assert.deepEqual(
      mahjong.replay(
        seed,
        solution.map(([a, b]) => ({ a, b })),
      ),
      state,
    );
    assert.throws(() => mahjong.move(state, 0, 1), /closed/);
  }
});

test('Mahjong replay and Club backups reject malformed or illegal actions', () => {
  assert.throws(() => mahjong.replay('A', [{ a: 18, b: 19, score: 999 }]), /Invalid Mahjong move/);
  assert.throws(() => mahjong.replay('A', [{ a: 18, b: 18 }]), /matching/);
  assert.throws(() => mahjong.replay('A', [{ a: 0, b: 19 }]), /matching/);
  assert.throws(() => mahjong.replay('<script>', []), /letters, numbers/);

  const valid = {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 1,
    lastHero: -1,
    runs: { mahjong: { seed: 'BACKUP', log: [{ a: 18, b: 19 }], redo: [] } },
    records: [],
    stamps: [],
  };
  assert.doesNotThrow(() => validator.validateSave(valid));
  assert.throws(
    () =>
      validator.validateSave({
        ...valid,
        runs: { mahjong: { seed: 'BACKUP', log: [{ a: 18, b: 19, extra: true }], redo: [] } },
      }),
    /Invalid Mahjong move/,
  );
  assert.throws(
    () =>
      validator.validateSave({
        ...valid,
        runs: { mahjong: { seed: 'bad seed', log: [], redo: [] } },
      }),
    /Invalid Mahjong seed/,
  );
});
