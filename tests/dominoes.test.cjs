'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../src/club-engines.js');
require('../src/core.js');
const C = require('../src/bridges.js');
require('../src/backup-validation.js');

const dominoes = E.dominoes;
const validator = AlibiBackupValidation(C, null, () => E, 4);

function baseState(overrides = {}) {
  return {
    seed: 'MANUAL',
    human: [18],
    bot: [3],
    stock: [],
    chain: [{ tile: 0, left: 1, right: 2 }],
    turn: 'human',
    done: false,
    winner: null,
    ...overrides,
  };
}

function playFirst(seed) {
  const start = dominoes.initial(seed);
  const action = { kind: 'play', tile: start.human[0], end: 'start' };
  return { start, action, state: dominoes.move(start, action) };
}

test('Draw Dominoes deals all 28 unique tiles reproducibly', () => {
  const first = dominoes.initial('DEAL-1');
  const second = dominoes.initial('DEAL-1');
  const other = dominoes.initial('DEAL-2');
  const dealt = first.human.concat(first.bot, first.stock).sort((a, b) => a - b);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first.human.concat(first.bot), other.human.concat(other.bot));
  assert.equal(first.human.length, 7);
  assert.equal(first.bot.length, 7);
  assert.equal(first.stock.length, 14);
  assert.deepEqual(
    dealt,
    Array.from({ length: 28 }, (_, id) => id),
  );
  assert.deepEqual(
    dominoes.legalMoves(first),
    first.human.map((tile) => ({ tile, end: 'start' })),
  );
});

test('Dominoes match either open end and preserve double handling', () => {
  const state = baseState({ human: [1, 7, 2], bot: [3, 4], stock: [] });
  const moves = dominoes.legalMoves(state);
  assert.ok(moves.some((move) => move.tile === 1 && move.end === 'left'));
  assert.ok(moves.some((move) => move.tile === 7 && move.end === 'left'));
  assert.ok(!moves.some((move) => move.tile === 1 && move.end === 'right'));
  assert.ok(dominoes.legalMoves({ ...state, human: [2] }).some((move) => move.end === 'right'));
  assert.deepEqual(dominoes.place(state, 1, 'left')[0], { tile: 1, left: 0, right: 1 });
  const played = dominoes.move(state, { kind: 'play', tile: 1, end: 'left' });
  assert.equal(played.chain.length, 3, 'the keeper responds after a human play');
  assert.equal(played.done, false);
});

test('Dominoes draws until playable, then permits pass only after stock empties', () => {
  let found = null;
  for (let i = 0; i < 5000 && !found; i++) {
    const candidate = playFirst('DRAW-' + i).state;
    if (!dominoes.legalMoves(candidate).length && candidate.stock.length) found = candidate;
  }
  assert.ok(found, 'a seeded hand should exercise the draw path');
  assert.throws(() => dominoes.move(found, { kind: 'pass' }), /stock is empty/);
  const drawn = dominoes.move(found, { kind: 'draw' });
  assert.equal(drawn.stock.length, found.stock.length - 1);
  assert.equal(drawn.human.length, found.human.length + 1);

  const blocked = baseState();
  assert.throws(
    () => dominoes.move({ ...blocked, stock: [4] }, { kind: 'pass' }),
    /stock is empty/,
  );
  const ended = dominoes.move(blocked, { kind: 'pass' });
  assert.equal(ended.done, true);
  assert.equal(ended.winner, 'bot', 'the lower pip hand wins a blocked round');
  assert.equal(dominoes.score(ended), -6);
});

test('Dominoes ends immediately when a hand empties and replays deterministically', () => {
  const state = baseState({ human: [1], bot: [3], stock: [4] });
  const action = { kind: 'play', tile: 1, end: 'left' };
  const won = dominoes.move(state, action);
  assert.equal(won.done, true);
  assert.equal(won.winner, 'human');
  assert.equal(won.humanPips, 0);
  assert.equal(won.botPips, 3);
  assert.equal(dominoes.score(won), 3);

  const first = playFirst('REPLAY-1');
  assert.deepEqual(first.state, dominoes.replay('REPLAY-1', [first.action]));
  assert.throws(
    () => dominoes.replay('REPLAY-1', [{ ...first.action, extra: true }]),
    /Invalid domino play/,
  );
  assert.throws(
    () => dominoes.replay('REPLAY-1', [{ kind: 'play', tile: 99, end: 'start' }]),
    /Invalid domino play/,
  );
  assert.throws(
    () => dominoes.replay('REPLAY-1', Array(501).fill({ kind: 'draw' })),
    /Invalid domino replay/,
  );
});

test('Club backups validate deterministic Dominoes logs and reject malformed imports', () => {
  const first = dominoes.initial('BACKUP');
  const valid = {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 1,
    lastHero: -1,
    runs: {
      dominoes: {
        seed: 'BACKUP',
        log: [{ kind: 'play', tile: first.human[0], end: 'start' }],
        redo: [],
      },
    },
    records: [],
    stamps: [],
  };
  assert.doesNotThrow(() => validator.validateSave(valid));
  assert.throws(
    () =>
      validator.validateSave({
        ...valid,
        runs: {
          dominoes: {
            seed: 'BACKUP',
            log: [{ kind: 'play', tile: first.human[0], end: 'start', extra: true }],
            redo: [],
          },
        },
      }),
    /Invalid domino play/,
  );
  assert.throws(
    () =>
      validator.validateSave({
        ...valid,
        runs: { dominoes: { seed: 'bad seed', log: [], redo: [] } },
      }),
    /Invalid domino seed/,
  );
  assert.doesNotThrow(() =>
    validator.validateSave({
      ...valid,
      records: [
        { id: 'x', type: 'dominoes', label: 'Draw Dominoes', score: 3, date: '2026-09-10' },
      ],
    }),
  );
});
