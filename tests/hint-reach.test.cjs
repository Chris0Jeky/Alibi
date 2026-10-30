'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path');
const { measure } = require('../tools/hint-reach.cjs');
const { load } = require('../tools/official-catalogue.cjs');
const families = measure(load(path.resolve(__dirname, '..'), false).puzzles);

// Fresh official boards on which Hint offers only the generic family tip. Lower a number when
// hints improve; a content or insights change must not raise one (#826). Before the
// 2026-10-30 hint work these were scene 43, dossier 29, witness 31, sudoku 21, futoshiki 27
// and trail 44 (#818, #821, #846).
const SILENT_AT_MOST = {
  scene: 8,
  dossier: 0,
  witness: 0,
  sudoku: 0,
  futoshiki: 2,
  trail: 17,
  lightup: 2,
  nonogram: 0,
  binary: 0,
  tents: 0,
  aquarium: 0,
  network: 0,
  bridges: 0,
};

test('every family is measured', () => {
  assert.deepEqual(Object.keys(families).sort(), Object.keys(SILENT_AT_MOST).sort());
});

for (const [type, most] of Object.entries(SILENT_AT_MOST))
  test(`${type}: at most ${most} fresh boards without a reasoning hint`, () => {
    assert.ok(
      families[type].silent <= most,
      `${families[type].silent} of ${families[type].boards} are silent`,
    );
  });

// Official boards that answer-independent hint steps alone complete (engine completion rule).
const SOLVED_AT_LEAST = {
  nonogram: 37,
  tents: 27,
  sudoku: 20,
  lightup: 15,
  trail: 13,
  futoshiki: 10,
  binary: 7,
};

for (const [type, least] of Object.entries(SOLVED_AT_LEAST))
  test(`${type}: hints alone still complete at least ${least} boards`, () => {
    assert.ok(families[type].solvedByHints >= least, String(families[type].solvedByHints));
  });
