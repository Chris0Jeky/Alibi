'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pack = require('../content/extra/after-hours-hard-studies.json');
const {
  countNonogram,
  countSudoku,
} = require('./helpers/hard-studies-oracle.cjs');

test('hard studies are additive, provisional and independently unique', () => {
  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.puzzles.length, 6);
  assert.equal(new Set(pack.puzzles.map((puzzle) => puzzle.id)).size, 6);
  for (const puzzle of pack.puzzles) {
    assert.equal(puzzle.revision, 1);
    assert.equal(puzzle.difficulty, 'Expert');
    assert.equal(puzzle.difficultyStatus, 'provisional');
    const result =
      puzzle.type === 'nonogram' ? countNonogram(puzzle) : countSudoku(puzzle);
    assert.equal(result.count, 1, `${puzzle.id} must have one solution`);
    assert.deepEqual(
      result.first,
      puzzle.solution,
      `${puzzle.id} solution must match the oracle`,
    );
  }
});
