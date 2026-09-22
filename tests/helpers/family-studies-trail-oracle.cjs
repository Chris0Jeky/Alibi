'use strict';

const { range, adjacent } = require('./family-studies-shared.cjs');

function countTrail(puzzle, limit = 2) {
  const total = puzzle.size ** 2;
  const positionByValue = new Map();
  for (let cell = 0; cell < total; cell++) {
    const value = puzzle.givens[cell];
    if (value) positionByValue.set(value, cell);
  }
  const path = [];
  const used = new Set();
  let count = 0;
  let first = null;
  let nodes = 0;

  function search(cell, value) {
    if (count >= limit) return;
    nodes++;
    if (used.has(cell)) return;
    if (puzzle.givens[cell] && puzzle.givens[cell] !== value) return;
    if (positionByValue.has(value) && positionByValue.get(value) !== cell) return;
    const future = [...positionByValue.keys()]
      .filter((candidate) => candidate > value)
      .sort((a, b) => a - b)[0];
    if (future) {
      const target = positionByValue.get(future);
      const distance =
        Math.abs(Math.floor(target / puzzle.size) - Math.floor(cell / puzzle.size)) +
        Math.abs((target % puzzle.size) - (cell % puzzle.size));
      if (distance > future - value || (future - value - distance) % 2) return;
    }
    used.add(cell);
    path.push(cell);
    if (value === total) {
      const solution = Array(total).fill(0);
      path.forEach((at, index) => (solution[at] = index + 1));
      count++;
      first ||= solution;
    } else {
      for (const next of adjacent(cell, puzzle.size)) search(next, value + 1);
    }
    path.pop();
    used.delete(cell);
  }

  const starts = positionByValue.has(1) ? [positionByValue.get(1)] : range(total);
  for (const start of starts) {
    search(start, 1);
    if (count >= limit) break;
  }
  return { count, first, nodes };
}

module.exports = { countTrail };
