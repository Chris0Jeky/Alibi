'use strict';

function linePatterns(size, clues) {
  if (clues.length === 1 && clues[0] === 0) return [Array(size).fill(0)];
  const out = [];
  function place(at, start, line) {
    const run = clues[at];
    const remaining = clues.slice(at + 1).reduce((sum, value) => sum + value, 0) + Math.max(0, clues.length - at - 1);
    const last = size - run - remaining;
    for (let offset = start; offset <= last; offset++) {
      const next = line.slice();
      for (let i = offset; i < offset + run; i++) next[i] = 1;
      if (at === clues.length - 1) out.push(next);
      else place(at + 1, offset + run + 1, next);
    }
  }
  place(0, 0, Array(size).fill(0));
  return out;
}

function countNonogram(puzzle, limit = 2) {
  const size = puzzle.size;
  const rows = puzzle.rowClues.map((clues) => linePatterns(size, clues));
  const cols = puzzle.colClues.map((clues) => linePatterns(size, clues));
  let count = 0;
  let first = null;
  let nodes = 0;

  function search(rowCandidates, colCandidates, grid) {
    if (count >= limit) return;
    nodes++;
    rowCandidates = rowCandidates.map((line) => line.slice());
    colCandidates = colCandidates.map((line) => line.slice());
    grid = grid.map((line) => line.slice());
    let changed = true;
    while (changed) {
      changed = false;
      for (let row = 0; row < size; row++) {
        const keep = rowCandidates[row].filter((pattern) =>
          pattern.every((value, col) => grid[row][col] < 0 || grid[row][col] === value),
        );
        if (!keep.length) return;
        if (keep.length !== rowCandidates[row].length) changed = true;
        rowCandidates[row] = keep;
        for (let col = 0; col < size; col++) {
          const values = new Set(keep.map((pattern) => pattern[col]));
          if (values.size === 1 && grid[row][col] < 0) {
            grid[row][col] = keep[0][col];
            changed = true;
          }
        }
      }
      for (let col = 0; col < size; col++) {
        const keep = colCandidates[col].filter((pattern) =>
          pattern.every((value, row) => grid[row][col] < 0 || grid[row][col] === value),
        );
        if (!keep.length) return;
        if (keep.length !== colCandidates[col].length) changed = true;
        colCandidates[col] = keep;
        for (let row = 0; row < size; row++) {
          const values = new Set(keep.map((pattern) => pattern[row]));
          if (values.size === 1 && grid[row][col] < 0) {
            grid[row][col] = keep[0][row];
            changed = true;
          }
        }
      }
    }
    if (grid.every((line) => line.every((value) => value >= 0))) {
      count++;
      first ||= grid.flat();
      return;
    }
    const choices = [];
    rowCandidates.forEach((candidates, index) => {
      if (candidates.length > 1) choices.push([candidates.length, 'row', index]);
    });
    colCandidates.forEach((candidates, index) => {
      if (candidates.length > 1) choices.push([candidates.length, 'col', index]);
    });
    choices.sort((a, b) => a[0] - b[0]);
    const [, axis, index] = choices[0];
    const candidates = axis === 'row' ? rowCandidates[index] : colCandidates[index];
    for (const pattern of candidates) {
      const nextRows = rowCandidates.map((line) => line.slice());
      const nextCols = colCandidates.map((line) => line.slice());
      const nextGrid = grid.map((line) => line.slice());
      if (axis === 'row') {
        nextRows[index] = [pattern];
        pattern.forEach((value, col) => (nextGrid[index][col] = value));
      } else {
        nextCols[index] = [pattern];
        pattern.forEach((value, row) => (nextGrid[row][index] = value));
      }
      search(nextRows, nextCols, nextGrid);
      if (count >= limit) return;
    }
  }

  search(rows, cols, Array.from({ length: size }, () => Array(size).fill(-1)));
  return { count, first, nodes };
}

function countSudoku(puzzle, limit = 2) {
  const grid = puzzle.givens.slice();
  const rows = Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const cols = Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const boxes = Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  for (let cell = 0; cell < 81; cell++) {
    const value = grid[cell];
    if (!value) continue;
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    if (!rows[row].has(value) || !cols[col].has(value) || !boxes[box].has(value)) {
      return { count: 0, first: null, nodes: 0 };
    }
    rows[row].delete(value);
    cols[col].delete(value);
    boxes[box].delete(value);
  }
  let count = 0;
  let first = null;
  let nodes = 0;

  function search() {
    if (count >= limit) return;
    nodes++;
    let cell = -1;
    let candidates = null;
    for (let at = 0; at < 81; at++) {
      if (grid[at]) continue;
      const row = Math.floor(at / 9);
      const col = at % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      const values = [...rows[row]].filter(
        (value) => cols[col].has(value) && boxes[box].has(value),
      );
      if (!values.length) return;
      if (!candidates || values.length < candidates.length) {
        cell = at;
        candidates = values;
        if (values.length === 1) break;
      }
    }
    if (cell < 0) {
      count++;
      first ||= grid.slice();
      return;
    }
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    for (const value of candidates) {
      grid[cell] = value;
      rows[row].delete(value);
      cols[col].delete(value);
      boxes[box].delete(value);
      search();
      boxes[box].add(value);
      cols[col].add(value);
      rows[row].add(value);
      grid[cell] = 0;
      if (count >= limit) return;
    }
  }

  search();
  return { count, first, nodes };
}

module.exports = { countNonogram, countSudoku };
