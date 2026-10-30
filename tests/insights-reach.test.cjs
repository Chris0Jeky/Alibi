'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
require('../src/core.js');
const C = require('../src/engines.js'),
  I = require('../src/insights.js');
const registry = require('../content/official-packs.json');
const official = registry.packs.flatMap((file) => require('../content/' + file).puzzles || []);
const latin = official.filter((p) => ['sudoku', 'futoshiki'].includes(p.type));
const hidden = (p) =>
  new Proxy(p, {
    get(target, key) {
      if (key === 'solution') throw Error('Solution consulted');
      return target[key];
    },
  });

test('every official Sudoku and Futoshiki follows sound hints without reading the answer', () => {
  let steps = 0;
  for (const p of latin) {
    const s = C.registry[p.type].initial(p);
    for (let step = 0; step < p.size ** 2; step++) {
      const hint = I.deduction(hidden(p), s);
      if (!hint || hint.value === undefined) break;
      assert.equal(hint.value, p.solution[hint.cells[0]], `${p.id}: ${hint.message}`);
      s.cells[hint.cells[0]] = hint.value;
      steps++;
    }
  }
  assert.ok(steps > 0);
});

test('a fresh official board below Master always has a reasoning hint', () => {
  // Before hidden singles and inequality chains, 21 of 49 Sudoku and 27 of 51 Futoshiki
  // boards offered only the generic tip from the start.
  const silent = latin
    .filter((p) => !['Master', 'Grandmaster'].includes(p.difficulty))
    .filter((p) => I.deduction(hidden(p), C.registry[p.type].initial(p))?.value === undefined)
    .map((p) => p.id);
  assert.deepEqual(silent, []);
});

test('a number with one open place in a row is named there', () => {
  // 4x4 Sudoku with 4s at B2, A3 and C4: no square has a single candidate,
  // but columns A, B and C leave D1 as row 1's only place for a 4.
  const p = { type: 'sudoku', size: 4, boxRows: 2, boxCols: 2, givens: Array(16).fill(0) },
    s = { cells: Array(16).fill(0) };
  for (const i of [5, 8, 14]) s.cells[i] = 4;
  const hint = I.deduction(p, s);
  assert.equal(hint.rule, 'Only one place for a number');
  assert.deepEqual([hint.cells[0], hint.value], [3, 4]);
  assert.match(
    hint.message,
    /Row 1 still needs a 4. Every other open square there is ruled out by its column or box, so it goes in D1./,
  );
});

test('an inequality chain bounds a Futoshiki square before any neighbour is filled', () => {
  // A1 < B1 < C1 on a 3x3 board: A1 must be 1.
  const p = {
      type: 'futoshiki',
      size: 3,
      givens: Array(9).fill(0),
      inequalities: [
        { a: 0, b: 1, op: '<' },
        { a: 1, b: 2, op: '<' },
      ],
    },
    hint = I.deduction(p, { cells: Array(9).fill(0) });
  assert.deepEqual([hint.cells[0], hint.value], [0, 1]);
  assert.match(hint.message, /inequality chain/);
});

test('marks that leave a square with no number ask for a correction', () => {
  // C1 sees 1 and 2 in its row, 3 in its box and 4 in its column, with no rule broken yet.
  const p = { type: 'sudoku', size: 4, boxRows: 2, boxCols: 2, givens: Array(16).fill(0) },
    cells = Array(16).fill(0);
  cells[0] = 1;
  cells[1] = 2;
  cells[6] = 3;
  cells[10] = 4;
  const hint = I.deduction(p, { cells });
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.match(hint.message, /No number fits C1/);
});
