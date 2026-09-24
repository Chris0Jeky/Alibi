'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
const I = require('../src/insights.js');

function fixture(rows, marks = {}) {
  const puzzle = {
    type: 'lightup',
    size: rows.length,
    walls: rows
      .join('')
      .split('')
      .map((tile) => (tile === '.' ? -2 : tile === '#' ? -1 : Number(tile))),
  };
  const state = C.registry.lightup.initial(puzzle);
  for (const [cell, value] of Object.entries(marks)) state.cells[cell] = value;
  return { puzzle, state };
}

function hintFor(rows, marks, cell, value, rule) {
  const { puzzle, state } = fixture(rows, marks);
  const before = structuredClone(state);
  const hint = I.deduction(puzzle, state);
  assert.ok(hint, 'a concrete deduction is available');
  assert.deepEqual(hint.cells, [cell]);
  assert.equal(hint.value, value);
  assert.equal(hint.rule, rule);
  assert.match(hint.message, /[A-C][1-3]/);
  assert.deepEqual(state, before, 'asking never marks the board');
}

test('lit squares exclude a second lantern along an unobstructed sight line', () => {
  hintFor(['...', '...', '...'], { 4: 1 }, 1, 0, 'No facing lanterns');
});

test('zero walls and fulfilled wall counts exclude remaining neighbours', () => {
  hintFor(['...', '.0.', '...'], {}, 1, 0, 'This wall has enough lanterns');
  hintFor(['1..', '...', '...'], { 1: 1, 2: 0, 4: 0, 7: 0 }, 3, 0, 'This wall has enough lanterns');
});

test('a wall needing every remaining available neighbour forces a lantern', () => {
  hintFor(['...', '.4.', '...'], {}, 1, 1, 'Fill the remaining neighbours');
  hintFor(['1..', '...', '...'], { 1: 0 }, 3, 1, 'Fill the remaining neighbours');
});

test('an excluded unlit square can force its only remaining light source', () => {
  hintFor(['..#', '###', '###'], { 0: 0 }, 1, 1, 'Only one way to light this square');
});

test('walls stop visibility and opposite row edges never become adjacent', () => {
  hintFor(['.#.', '###', '###'], { 0: 1 }, 2, 1, 'Only one way to light this square');
  hintFor(['##.', '.##', '###'], { 2: 1 }, 3, 1, 'Only one way to light this square');
});

test('ambiguity stays a strategy tip and existing conflicts take precedence', () => {
  const empty = fixture(['...', '...', '...']);
  assert.equal(I.deduction(empty.puzzle, empty.state), null);
  const conflict = fixture(['...', '.0.', '...'], { 1: 1 });
  const hint = I.deduction(conflict.puzzle, conflict.state);
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.equal(hint.value, undefined);
});

// Independent exhaustive model: no engine geometry, validation, solver or answer data.
function completions(puzzle) {
  const n = puzzle.size,
    cells = puzzle.walls.flatMap((w, i) => (w === -2 ? [i] : []));
  const adjacent = (a, b) =>
    Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs((a % n) - (b % n)) === 1;
  const sees = (a, b) => {
    if (a === b) return true;
    if (Math.floor(a / n) !== Math.floor(b / n) && a % n !== b % n) return false;
    const step = Math.floor(a / n) === Math.floor(b / n) ? 1 : n;
    for (let i = Math.min(a, b) + step; i < Math.max(a, b); i += step) {
      if (puzzle.walls[i] !== -2) return false;
    }
    return true;
  };
  const answers = [];
  for (let mask = 0; mask < 2 ** cells.length; mask++) {
    const bulbs = cells.filter((_, bit) => mask & (1 << bit));
    if (bulbs.some((a) => bulbs.some((b) => a !== b && sees(a, b)))) continue;
    if (cells.some((cell) => !bulbs.some((bulb) => sees(cell, bulb)))) continue;
    if (puzzle.walls.some((w, i) => w >= 0 && bulbs.filter((b) => adjacent(i, b)).length !== w))
      continue;
    answers.push(puzzle.walls.map((_, i) => (bulbs.includes(i) ? 1 : 0)));
  }
  return { cells, answers };
}

test('hints agree with every compatible exhaustive solution, including ambiguous boards', () => {
  let checked = 0,
    deductions = 0;
  const layouts = [
    ['...', '...', '...'],
    ['...', '.#.', '...'],
    ...[0, 2, 4].map((number) => ['...', `.${number}.`, '...']),
    ['.1.', '.#.', '...'],
    ['1..', '...', '...'],
    ['..#', '###', '###'],
  ];
  for (const rows of layouts) {
    const { puzzle } = fixture(rows),
      { cells, answers } = completions(puzzle);
    assert.ok(answers.length, rows.join('/'));
    const partials = new Map();
    for (const answer of answers) {
      for (let mask = 0; mask < 2 ** cells.length; mask++) {
        const state = C.registry.lightup.initial(puzzle);
        cells.forEach((cell, bit) => {
          if (mask & (1 << bit)) state.cells[cell] = answer[cell];
        });
        const key = state.cells.join(',');
        if (!partials.has(key)) partials.set(key, { state, answers: [] });
        partials.get(key).answers.push(answer);
      }
    }
    for (const { state, answers: compatible } of partials.values()) {
      const before = structuredClone(state),
        hint = I.deduction(puzzle, state);
      assert.deepEqual(state, before);
      if (hint) {
        assert.notEqual(hint.value, undefined, 'a completable board has no conflict');
        assert.equal(state.cells[hint.cells[0]], -1);
        assert.equal(puzzle.walls[hint.cells[0]], -2);
        assert.ok(compatible.every((answer) => answer[hint.cells[0]] === hint.value));
        deductions++;
      }
      checked++;
    }
  }
  assert.ok(checked > 1000, 'exercise more than handpicked happy paths');
  assert.ok(deductions > 100, 'do not pass by returning no guidance');
  console.log(
    `Lantern oracle: ${deductions} deductions across ${checked} compatible partial boards`,
  );
});

test('official Lantern hints stay pure, answer-independent and agree with verified answers', () => {
  let count = 0;
  for (const puzzle of load(process.cwd(), false).puzzles.filter((p) => p.type === 'lightup')) {
    const hidden = new Proxy(puzzle, {
      get(target, key) {
        if (key === 'solution') throw Error('A reasoning hint consulted the answer');
        return target[key];
      },
    });
    let state = C.registry.lightup.initial(hidden);
    for (let step = 0; step < puzzle.size ** 2; step++) {
      const before = structuredClone(state),
        hint = I.deduction(hidden, state);
      assert.deepEqual(state, before);
      if (!hint) break;
      assert.notEqual(hint.value, undefined, puzzle.id);
      assert.equal(hint.value, puzzle.solution[hint.cells[0]], puzzle.id);
      state = C.registry.lightup.reduce(hidden, state, {
        type: 'set',
        cell: hint.cells[0],
        value: hint.value,
      });
      count++;
    }
  }
  assert.ok(count > 0, 'the official catalogue receives real guidance');
  console.log(`Official Lantern deductions checked: ${count}`);
});
