'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../src/club-engines.js');
require('../src/core.js');
const C = require('../src/bridges.js');
require('../src/backup-validation.js');

const blocks = E.blockCabinet;
const validator = AlibiBackupValidation(C, null, () => E, 4);

function boardWith(cells) {
  const board = Array(64).fill(0);
  for (const cell of cells) board[cell] = 1;
  return board;
}

test('Block Cabinet draws reproducible trays and replays placements', () => {
  const first = blocks.initial('CABINET-1');
  assert.deepEqual(first, blocks.initial('CABINET-1'));
  assert.notDeepEqual(first.tray, blocks.initial('CABINET-2').tray);
  const shape = blocks.shape(first.tray[0]);
  assert.ok(blocks.legal(first, 0, 0));
  const placed = blocks.move(first, 0, 0);
  assert.deepEqual(first.board, Array(64).fill(0), 'move does not mutate the board');
  assert.deepEqual(placed, blocks.replay('CABINET-1', [{ slot: 0, cell: 0 }]));
  assert.deepEqual(placed.tray.slice(1), first.tray.slice(1), 'unused tray pieces remain');
  assert.equal(
    placed.score,
    shape.cells.length,
    'a placement scores its occupied cells when no line clears',
  );
});

test('Block Cabinet only places the displayed orientation and clears rows and columns together', () => {
  const oriented = blocks.initial('ORIENTATION');
  oriented.tray = ['line4-h', 'single', 'single'];
  assert.ok(blocks.legal(oriented, 0, 4), 'the displayed horizontal piece fits');
  assert.deepEqual(blocks.cellsAt(oriented, 0, 0), [0, 1, 2, 3]);
  assert.notDeepEqual(blocks.cellsAt(oriented, 0, 0), [0, 8, 16, 24]);

  const cross = blocks.initial('CLEAR');
  cross.tray = ['cross', 'single', 'single'];
  cross.board = boardWith([
    8 + 3,
    8 + 4,
    8 + 5,
    8 + 6,
    8 + 7,
    3 * 8 + 1,
    4 * 8 + 1,
    5 * 8 + 1,
    6 * 8 + 1,
    7 * 8 + 1,
  ]);
  const cleared = blocks.move(cross, 0, 0);
  assert.deepEqual(cleared.lastClear, { rows: [1], columns: [1] });
  assert.equal(cleared.board[8 + 3], 0, 'the completed row clears');
  assert.equal(cleared.board[3 * 8 + 1], 0, 'the completed column clears');
  assert.equal(cleared.score, 25, 'simultaneous row and column clears score once each');
});

test('Block Cabinet keeps a legal origin when its occupied bounding corner is outside the shape', () => {
  const first = blocks.initial('A2');
  assert.deepEqual(first.tray, ['l5', 'cross', 'stair5']);
  const placed = blocks.move(first, 0, 0);
  assert.equal(placed.board[25], 1, 'the prior long angle occupies the later origin');
  assert.equal(placed.tray[1], 'cross');
  assert.ok(blocks.legal(placed, 1, 25), 'the cross does not use its occupied bounding corner');
  assert.deepEqual(blocks.cellsAt(placed, 1, 25), [26, 33, 34, 35, 42]);
});

test('Block Cabinet detects a stuck tray and rejects untrusted replays', () => {
  const stuck = blocks.initial('STUCK');
  stuck.board = Array(64).fill(1);
  assert.equal(blocks.isGameOver(stuck), true);
  assert.throws(() => blocks.move(stuck, 0, 0), /does not fit|closed/);
  assert.throws(
    () => blocks.replay('STUCK', [{ slot: 0, cell: 0, score: 999 }]),
    /Invalid Block Cabinet move/,
  );
  assert.throws(
    () =>
      blocks.replay('STUCK', [
        { slot: 0, cell: 0 },
        { slot: 0, cell: 0 },
      ]),
    /does not fit/,
  );
  assert.throws(
    () => blocks.replay('STUCK', Array(501).fill({ slot: 0, cell: 0 })),
    /Invalid Block Cabinet replay/,
  );
});

test('Club backups validate Block Cabinet replay and refuse malformed moves', () => {
  const valid = {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 1,
    lastHero: -1,
    runs: { blockcabinet: { seed: 'BACKUP', log: [{ slot: 0, cell: 0 }], redo: [] } },
    records: [],
    stamps: [],
  };
  assert.doesNotThrow(() => validator.validateSave(valid));
  assert.throws(
    () =>
      validator.validateSave({
        ...valid,
        runs: {
          blockcabinet: { seed: 'BACKUP', log: [{ slot: 0, cell: 0, extra: true }], redo: [] },
        },
      }),
    /Invalid Block Cabinet move/,
  );
  assert.doesNotThrow(() =>
    validator.validateSave({
      ...valid,
      records: [{ id: 'x', type: 'blockcabinet', label: 'Blocks', score: 5, date: '2026-09-10' }],
    }),
  );
  assert.throws(
    () =>
      validator.validateSave({
        ...valid,
        records: [{ id: 'x', type: 'not-a-game', label: 'Blocks', score: 5, date: '2026-09-10' }],
      }),
    /Invalid record/,
  );
  assert.throws(
    () =>
      validator.validateSave({
        ...valid,
        runs: { blockcabinet: { seed: 'bad seed', log: [], redo: [] } },
      }),
    /Invalid Block Cabinet seed/,
  );
});
