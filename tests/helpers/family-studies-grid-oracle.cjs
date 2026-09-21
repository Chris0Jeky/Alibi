'use strict';

const { countNonogram } = require('./hard-studies-oracle.cjs');
const { range } = require('./family-studies-shared.cjs');

function binaryLines(size) {
  const lines = [];
  const half = size / 2;
  function visit(line, ones) {
    if (line.length === size) {
      if (ones === half) lines.push(line.slice());
      return;
    }
    const remaining = size - line.length - 1;
    for (const value of [0, 1]) {
      const nextOnes = ones + value;
      if (nextOnes > half || nextOnes + remaining < half) continue;
      if (
        line.length >= 2 &&
        line[line.length - 1] === value &&
        line[line.length - 2] === value
      )
        continue;
      line.push(value);
      visit(line, nextOnes);
      line.pop();
    }
  }
  visit([], 0);
  return lines;
}

function countBinary(puzzle, limit = 2) {
  const { size } = puzzle;
  const candidates = binaryLines(size);
  const rows = range(size).map((row) =>
    candidates.filter((line) =>
      line.every((value, col) => {
        const given = puzzle.givens[row * size + col];
        return given < 0 || given === value;
      }),
    ),
  );
  const chosen = [];
  let count = 0;
  let first = null;
  let nodes = 0;

  function search(row) {
    if (count >= limit) return;
    nodes++;
    if (row === size) {
      const columns = range(size).map((col) => chosen.map((line) => line[col]).join(''));
      if (new Set(columns).size !== size) return;
      count++;
      first ||= chosen.flat();
      return;
    }
    for (const line of rows[row]) {
      const key = line.join('');
      if (chosen.some((other) => other.join('') === key)) continue;
      let valid = true;
      for (let col = 0; col < size && valid; col++) {
        let ones = line[col];
        for (let prior = 0; prior < row; prior++) ones += chosen[prior][col];
        if (ones > size / 2 || ones + (size - row - 1) < size / 2) valid = false;
        if (
          row >= 2 &&
          chosen[row - 1][col] === line[col] &&
          chosen[row - 2][col] === line[col]
        )
          valid = false;
      }
      if (!valid) continue;
      chosen.push(line);
      search(row + 1);
      chosen.pop();
      if (count >= limit) return;
    }
  }

  search(0);
  return { count, first, nodes };
}

function countFutoshiki(puzzle, limit = 2) {
  const { size } = puzzle;
  const grid = puzzle.givens.slice();
  const rows = range(size).map(() => new Set());
  const cols = range(size).map(() => new Set());
  const touching = range(size * size).map(() => []);
  for (const inequality of puzzle.inequalities) {
    touching[inequality.a].push(inequality);
    touching[inequality.b].push(inequality);
  }
  for (let cell = 0; cell < grid.length; cell++) {
    const value = grid[cell];
    if (!value) continue;
    const row = Math.floor(cell / size);
    const col = cell % size;
    if (rows[row].has(value) || cols[col].has(value)) {
      return { count: 0, first: null, nodes: 0 };
    }
    rows[row].add(value);
    cols[col].add(value);
  }
  let count = 0;
  let first = null;
  let nodes = 0;

  function satisfies(cell, value) {
    for (const inequality of touching[cell]) {
      const otherCell = inequality.a === cell ? inequality.b : inequality.a;
      const other = grid[otherCell];
      if (!other) continue;
      const left = inequality.a === cell ? value : other;
      const right = inequality.b === cell ? value : other;
      if (inequality.op === '<' ? left >= right : left <= right) return false;
    }
    return true;
  }

  function domain(cell) {
    const row = Math.floor(cell / size);
    const col = cell % size;
    return range(size)
      .map((index) => index + 1)
      .filter(
        (value) => !rows[row].has(value) && !cols[col].has(value) && satisfies(cell, value),
      );
  }

  function search() {
    if (count >= limit) return;
    nodes++;
    let chosen = -1;
    let values = null;
    for (let cell = 0; cell < grid.length; cell++) {
      if (grid[cell]) continue;
      const options = domain(cell);
      if (!options.length) return;
      if (!values || options.length < values.length) {
        chosen = cell;
        values = options;
        if (options.length === 1) break;
      }
    }
    if (chosen < 0) {
      count++;
      first ||= grid.slice();
      return;
    }
    const row = Math.floor(chosen / size);
    const col = chosen % size;
    for (const value of values) {
      grid[chosen] = value;
      rows[row].add(value);
      cols[col].add(value);
      search();
      cols[col].delete(value);
      rows[row].delete(value);
      grid[chosen] = 0;
      if (count >= limit) return;
    }
  }

  search();
  return { count, first, nodes };
}

module.exports = { countNonogram, countBinary, countFutoshiki };
