'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
const I = require('../src/insights.js');

function fixture(marks = {}) {
  const puzzle = {
    type: 'tents',
    size: 3,
    trees: [1, 7],
    rowTargets: [1, 0, 1],
    colTargets: [1, 0, 1],
  };
  const state = C.registry.tents.initial(puzzle);
  for (const [cell, value] of Object.entries(marks)) state.cells[cell] = value;
  return { puzzle, state };
}
function checkHint(marks, cell, value, rule) {
  const { puzzle, state } = fixture(marks);
  const before = structuredClone(state);
  const hint = I.deduction(puzzle, state);
  assert.ok(hint, 'a local deduction exists');
  assert.deepEqual(hint.cells, [cell]);
  assert.equal(hint.value, value);
  assert.equal(hint.rule, rule);
  assert.match(hint.message, /[A-C][1-3]/);
  assert.deepEqual(state, before);
}

test('a tent requires an orthogonally adjacent tree, not a diagonal or wrapped one', () => {
  checkHint({}, 3, 0, 'Each tent needs a tree');
  const { puzzle, state } = fixture();
  puzzle.trees = [2];
  puzzle.rowTargets = [1, 0, 0];
  puzzle.colTargets = [0, 1, 0];
  state.cells[0] = 0;
  state.cells[1] = 0;
  const hint = I.deduction(puzzle, state);
  assert.deepEqual(hint.cells, [3]);
  assert.equal(hint.value, 0);
  assert.equal(hint.rule, 'Each tent needs a tree');
});
test('a placed tent excludes diagonal neighbours as well as touching sides', () => {
  checkHint({ 0: 1, 3: 0, 5: 0 }, 4, 0, 'Leave a gap between tents');
});
test('a fulfilled row count excludes its other unknown squares', () => {
  checkHint({ 0: 1, 3: 0, 4: 0, 5: 0 }, 2, 0, 'This line has enough tents');
});
test('a line with only the required number of unknown squares forces a tent', () => {
  checkHint({ 0: 0, 3: 0, 4: 0, 5: 0 }, 2, 1, 'Fill the remaining tent sites');
});
test('no tree cell is suggested, ambiguity remains and conflicts take priority', () => {
  const { puzzle, state } = fixture({ 3: 0, 4: 0, 5: 0 });
  assert.equal(I.deduction(puzzle, state), null);
  state.cells[1] = 1;
  const hint = I.deduction(puzzle, state);
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.equal(hint.value, undefined);
});

// An independent finite model, including an explicit injective tree/tent assignment.
function oracle(puzzle) {
  const n = puzzle.size;
  const cells = Array.from({ length: n * n }, (_, i) => i).filter((i) => !puzzle.trees.includes(i));
  const adjacent = (a, b) =>
    Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs((a % n) - (b % n)) === 1;
  const match = (tents, tree = 0, used = new Set()) =>
    tree === puzzle.trees.length ||
    tents.some((tent) => {
      if (used.has(tent) || !adjacent(puzzle.trees[tree], tent)) return false;
      return match(tents, tree + 1, new Set([...used, tent]));
    });
  const answers = [];
  for (let mask = 0; mask < 2 ** cells.length; mask++) {
    const tents = cells.filter((_, bit) => mask & (1 << bit));
    if (tents.length !== puzzle.trees.length) continue;
    if (
      tents.some((a) =>
        tents.some(
          (b) =>
            a !== b &&
            Math.max(
              Math.abs(Math.floor(a / n) - Math.floor(b / n)),
              Math.abs((a % n) - (b % n)),
            ) <= 1,
        ),
      )
    )
      continue;
    if (
      puzzle.rowTargets.some(
        (v, row) => tents.filter((i) => Math.floor(i / n) === row).length !== v,
      )
    )
      continue;
    if (puzzle.colTargets.some((v, col) => tents.filter((i) => i % n === col).length !== v))
      continue;
    if (!match(tents)) continue;
    answers.push(Array.from({ length: n * n }, (_, i) => (tents.includes(i) ? 1 : 0)));
  }
  return { cells, answers };
}

test('every deduction agrees with every compatible completion of small Tents boards', () => {
  let states = 0,
    deductions = 0,
    ambiguous = 0,
    columns = 0;
  const { puzzle: base } = fixture();
  const puzzles = [
    base,
    { ...base, trees: [3, 5], rowTargets: [1, 0, 1], colTargets: [1, 0, 1] },
    { ...base, trees: [0, 8], rowTargets: [1, 0, 1], colTargets: [0, 2, 0] },
    { ...base, trees: [4], rowTargets: [0, 1, 0], colTargets: [1, 0, 0] },
  ];
  for (const puzzle of puzzles) {
    const { cells, answers } = oracle(puzzle);
    assert.ok(answers.length);
    const partials = new Map();
    for (const answer of answers)
      for (let mask = 0; mask < 2 ** cells.length; mask++) {
        const state = C.registry.tents.initial(puzzle);
        cells.forEach((cell, bit) => {
          if (mask & (1 << bit)) state.cells[cell] = answer[cell];
        });
        const key = state.cells.join(',');
        if (!partials.has(key)) partials.set(key, { state, compatible: [] });
        partials.get(key).compatible.push(answer);
      }
    for (const { state, compatible } of partials.values()) {
      const before = structuredClone(state);
      const hint = I.deduction(puzzle, state);
      assert.deepEqual(state, before);
      if (hint) {
        assert.notEqual(hint.value, undefined, 'a completable position cannot have a conflict');
        assert.equal(state.cells[hint.cells[0]], -1);
        assert.ok(!puzzle.trees.includes(hint.cells[0]));
        assert.ok(compatible.every((answer) => answer[hint.cells[0]] === hint.value));
        deductions++;
        if (hint.message.startsWith('Column ')) columns++;
        if (compatible.length > 1) ambiguous++;
      }
      states++;
    }
  }
  assert.ok(states > 500);
  assert.ok(deductions > 100);
  assert.ok(ambiguous > 0, 'sound guidance on a genuinely ambiguous position');
  assert.ok(columns > 0, 'exercise column deductions as well as row deductions');
  console.log(`Tents oracle: ${deductions} deductions across ${states} partial boards`);
});

test('official Tents deductions never read answers or mutate requested state', () => {
  let count = 0;
  for (const puzzle of load(process.cwd(), false).puzzles.filter((p) => p.type === 'tents')) {
    const publicPuzzle = new Proxy(puzzle, {
      get(target, key) {
        if (key === 'solution') throw Error('Hint read the answer');
        return target[key];
      },
    });
    let state = C.registry.tents.initial(publicPuzzle);
    for (let step = 0; step < puzzle.size ** 2; step++) {
      const before = structuredClone(state);
      const hint = I.deduction(publicPuzzle, state);
      assert.deepEqual(state, before);
      if (!hint) break;
      assert.notEqual(hint.value, undefined, puzzle.id);
      assert.equal(state.cells[hint.cells[0]], -1);
      assert.equal(hint.value, puzzle.solution[hint.cells[0]], puzzle.id);
      state = C.registry.tents.reduce(publicPuzzle, state, {
        type: 'set',
        cell: hint.cells[0],
        value: hint.value,
      });
      count++;
    }
  }
  assert.ok(count > 0);
  console.log(`Official Tents deductions: ${count}`);
});
