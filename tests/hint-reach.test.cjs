'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path');
const { measure } = require('../tools/hint-reach.cjs');
const { load } = require('../tools/official-catalogue.cjs');
const families = measure(load(path.resolve(__dirname, '..'), false).puzzles);

// Fresh official boards on which Hint offers only the generic family tip. Lower a number when
// hints improve; a content or insights change must not raise one (#826). Mystery families
// have no reasoning hints yet (#846).
const SILENT_AT_MOST = {
  scene: 43,
  dossier: 29,
  witness: 31,
  sudoku: 21,
  futoshiki: 27,
  trail: 44,
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

test('Picture logic hints still solve almost every official board', () => {
  // Measured 37 of 40; the walk applies only answer-independent single-cell steps.
  assert.ok(families.nonogram.solvedByHints >= 37, String(families.nonogram.solvedByHints));
});
