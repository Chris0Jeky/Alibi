const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');

const grid = (type) => ({
  type,
  size: 4,
  boxRows: 2,
  boxCols: 2,
  givens: Array(16).fill(0),
});

test('Sudoku placement prunes only the placed value from row, column, and box peer notes', () => {
  const puzzle = grid('sudoku');
  const state = {
    cells: Array(16).fill(0),
    notes: {
      1: [2, 3],
      4: [2],
      5: [1, 2],
      10: [2],
      15: [1, 4],
    },
  };

  const next = C.registry.sudoku.reduce(puzzle, state, {
    type: 'set',
    cell: 0,
    value: 2,
  });

  assert.equal(next.cells[0], 2);
  assert.deepEqual(next.notes[1], [3], 'same-row peer keeps unrelated candidates');
  assert.equal(next.notes[4], undefined, 'empty same-column note entry is removed');
  assert.deepEqual(next.notes[5], [1], 'box-only peer loses the placed candidate');
  assert.deepEqual(next.notes[10], [2], 'non-peer note is untouched');
  assert.deepEqual(next.notes[15], [1, 4], 'unrelated non-peer notes are untouched');
  assert.deepEqual(state.notes[1], [2, 3], 'the reducer does not mutate the prior state');
});

test('Sudoku pencil entry does not prune matching peer candidates', () => {
  const puzzle = grid('sudoku');
  const state = { cells: Array(16).fill(0), notes: { 1: [2] } };
  const next = C.registry.sudoku.reduce(puzzle, state, {
    type: 'set',
    cell: 0,
    value: 2,
    pencil: true,
  });
  assert.deepEqual(next.notes[0], [2]);
  assert.deepEqual(next.notes[1], [2]);
});

test('Futoshiki placement keeps existing note behavior', () => {
  const puzzle = grid('futoshiki');
  const state = { cells: Array(16).fill(0), notes: { 1: [2], 4: [2] } };
  const next = C.registry.futoshiki.reduce(puzzle, state, {
    type: 'set',
    cell: 0,
    value: 2,
  });
  assert.deepEqual(next.notes[1], [2]);
  assert.deepEqual(next.notes[4], [2]);
});
