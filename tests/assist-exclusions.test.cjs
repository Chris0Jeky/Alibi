'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../src/core.js');
const A = require('../src/assist.js');

function sudokuPuzzle() {
  return { type: 'sudoku', size: 4, boxRows: 2, boxCols: 2 };
}

function stateWith(cells) {
  const s = { cells: Array(16).fill(0), notes: {} };
  for (const [cell, value] of cells) s.cells[cell] = value;
  return s;
}

test('sudoku row exclusion names the row', () => {
  const p = sudokuPuzzle();
  const s = stateWith([[0, 3]]);
  assert.match(A.reason(p, s, 1, 3), /already in row/);
});

test('sudoku column exclusion names the column', () => {
  const p = sudokuPuzzle();
  const s = stateWith([[0, 3]]);
  assert.match(A.reason(p, s, 8, 3), /already in column/);
});

test('sudoku box exclusion names the box', () => {
  const p = sudokuPuzzle();
  const s = stateWith([[0, 3]]);
  assert.match(A.reason(p, s, 5, 3), /already in this box/);
});

test('candidates exclude a row-conflicting value', () => {
  const p = { type: 'sudoku', size: 9, boxRows: 3, boxCols: 3 };
  const cells = Array(9 * 9).fill(0);
  cells[0] = 5;
  const s = { cells, notes: {} };
  const result = A.candidates(p, s, 4);
  assert.ok(!result.includes(5), 'row conflict removes 5 from candidates');
});
