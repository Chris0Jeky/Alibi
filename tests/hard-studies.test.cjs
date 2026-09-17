'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pack = require('../content/extra/after-hours-hard-studies.json');
const oracle = require('./helpers/hard-studies-oracle.cjs');
const existing = [
  ...require('../content/extra/nonogram-large.json').puzzles,
  ...require('../content/extra/expert-families.json').puzzles,
];

function nonogramSymmetries(solution, size) {
  const grid = Array.from({ length: size }, (_, row) =>
    solution.slice(row * size, row * size + size),
  );
  const signatures = [];
  for (const flip of [false, true]) {
    for (let rotations = 0; rotations < 4; rotations++) {
      const values = [];
      for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
          let sourceRow = row;
          let sourceColumn = column;
          if (flip) sourceRow = size - 1 - sourceRow;
          for (let turn = 0; turn < rotations; turn++)
            [sourceRow, sourceColumn] = [sourceColumn, size - 1 - sourceRow];
          values.push(grid[sourceRow][sourceColumn]);
        }
      }
      signatures.push(values.join(''));
    }
  }
  return signatures;
}

function semanticSignatures(puzzle) {
  if (puzzle.type === 'nonogram') return nonogramSymmetries(puzzle.solution, puzzle.size);
  if (puzzle.type === 'sudoku')
    return [puzzle.givens.map((value) => (value ? String(value) : '.')).join('')];
  return [];
}

const existingSignatures = existing.reduce((signatures, puzzle) => {
  const key = puzzle.type + ':' + puzzle.size;
  signatures.set(key, [...(signatures.get(key) || []), ...semanticSignatures(puzzle)]);
  return signatures;
}, new Map());

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
    const key = puzzle.type + ':' + puzzle.size;
    const duplicate = (existingSignatures.get(key) || []).some((signature) =>
      semanticSignatures(puzzle).includes(signature),
    );
    assert.equal(duplicate, false, puzzle.id + ' is a distinct semantic study');
  }
});
