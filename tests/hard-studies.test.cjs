'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pack = require('../content/extra/after-hours-hard-studies.json');
const oracle = require('./helpers/hard-studies-oracle.cjs');

test('hard studies have one independently verified solution', () => {
  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.puzzles.length, 6);
  const ids = pack.puzzles.map((puzzle) => puzzle.id);
  assert.equal(new Set(ids).size, 6);
  for (const puzzle of pack.puzzles) {
    assert.equal(puzzle.revision, 1);
    assert.equal(puzzle.difficulty, 'Expert');
    assert.equal(puzzle.difficultyStatus, 'provisional');
    let result;
    if (puzzle.type === 'nonogram') {
      result = oracle.countNonogram(puzzle);
    } else {
      result = oracle.countSudoku(puzzle);
    }
    assert.equal(result.count, 1);
    assert.deepEqual(result.first, puzzle.solution);
  }
});
