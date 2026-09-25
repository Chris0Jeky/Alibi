'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
const I = require('../src/insights.js');

function puzzle(size = 4) {
  return new Proxy(
    { type: 'binary', size, givens: Array(size ** 2).fill(-1) },
    {
      get(target, key) {
        if (key === 'solution') throw Error('Reasoning consulted the answer');
        return target[key];
      },
    },
  );
}
function localRules(cells, n) {
  const rows = Array.from({ length: n }, (_, r) => cells.slice(r * n, (r + 1) * n));
  const cols = Array.from({ length: n }, (_, c) => rows.map((row) => row[c]));
  return [rows, cols].every((lines) =>
    lines.every(
      (line, index) =>
        [0, 1].every((v) => line.filter((value) => value === v).length <= n / 2) &&
        !line.some((v, i) => v >= 0 && i > 1 && line[i - 1] === v && line[i - 2] === v) &&
        (line.includes(-1) ||
          !lines.slice(0, index).some((other) => other.every((v, i) => v === line[i]))),
    ),
  );
}
function uniquenessFixture(transpose) {
  const p = puzzle(6),
    s = C.registry.binary.initial(p);
  s.cells.splice(0, 6, 0, 1, 0, 1, 0, 1);
  s.cells.splice(18, 6, 0, 1, -1, -1, 0, 1);
  if (transpose) s.cells = s.cells.map((_, i, a) => a[(i % 6) * 6 + Math.floor(i / 6)]);
  return { p, s, cell: transpose ? 15 : 20 };
}
for (const transpose of [false, true]) {
  test(`two open ${transpose ? 'column' : 'row'} squares cannot copy a completed line`, () => {
    const { p, s, cell } = uniquenessFixture(transpose);
    const before = structuredClone(s),
      hint = I.deduction(p, s);
    assert.ok(hint, 'the distinct-line rule supplies a deduction');
    assert.equal(hint.cells[0], cell);
    assert.equal(hint.value, 1);
    assert.match(hint.message, /different/);
    assert.deepEqual(s, before);
  });
}

test('opposing row and column constraints produce advice, not an invalid symbol', () => {
  const p = puzzle(),
    s = { cells: [-1, -1, 1, 1, -1, 0, 1, 1, 0, 1, -1, -1, 0, 1, -1, -1], notes: {} };
  assert.ok(localRules(s.cells, 4));
  const before = structuredClone(s),
    hint = I.deduction(p, s);
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.equal(hint.value, undefined);
  assert.match(hint.message, /marks/i);
  assert.deepEqual(s, before);
});

// Independent complete-board enumeration, using only counts, triples and distinct lines.
function completions(n, marks) {
  const lines = [];
  for (let mask = 0; mask < 2 ** n; mask++) {
    const row = Array.from({ length: n }, (_, i) => (mask >> i) & 1);
    if (row.reduce((a, b) => a + b, 0) !== n / 2) continue;
    if (row.some((v, i) => i > 1 && row[i - 1] === v && row[i - 2] === v)) continue;
    lines.push(row);
  }
  const answers = [];
  function visit(cells, row) {
    if (row === n) {
      answers.push(cells);
      return;
    }
    for (const line of lines) {
      if (!line.every((v, col) => marks[row * n + col] < 0 || marks[row * n + col] === v)) continue;
      const next = cells.slice();
      next.splice(row * n, n, ...line);
      if (localRules(next, n)) visit(next, row + 1);
    }
  }
  visit(Array(n * n).fill(-1), 0);
  return answers;
}

test('the distinct-line deductions agree with every independently enumerated completion', () => {
  for (const transpose of [false, true]) {
    const { p, s } = uniquenessFixture(transpose),
      answers = completions(6, s.cells);
    assert.ok(answers.length > 1, 'this is a partial, ambiguous board, not an answer lookup');
    const hint = I.deduction(p, s);
    assert.ok(hint && hint.value !== undefined);
    assert.ok(answers.every((a) => a[hint.cells[0]] === hint.value));
    console.log(`Distinct-line oracle: ${answers.length} compatible completions`);
  }
});

test('hints are sound on ambiguous boards and safe on arbitrary locally legal marks', () => {
  const p = puzzle(),
    answers = completions(4, p.givens);
  let seed = 173,
    checked = 0,
    advised = 0;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let sample = 0; sample < 1500; sample++) {
    const source = answers[sample % answers.length];
    const cells = source.map((v) => (random() % 3 ? v : -1));
    const compatible = answers.filter((a) => a.every((v, i) => cells[i] < 0 || cells[i] === v));
    const state = { cells, notes: {} },
      before = structuredClone(state);
    const hint = I.deduction(p, state);
    assert.deepEqual(state, before);
    if (!hint) continue;
    assert.notEqual(hint.value, undefined);
    assert.ok(compatible.every((a) => a[hint.cells[0]] === hint.value));
    advised++;
  }
  for (let sample = 0; sample < 12000; sample++) {
    const cells = Array.from({ length: 16 }, () => (random() % 3) - 1);
    if (!localRules(cells, 4)) continue;
    const state = { cells, notes: {} },
      before = structuredClone(state);
    const hint = I.deduction(p, state);
    assert.deepEqual(state, before);
    if (hint?.value !== undefined) {
      const next = C.registry.binary.reduce(p, state, {
        type: 'set',
        cell: hint.cells[0],
        value: hint.value,
      });
      assert.ok(localRules(next.cells, 4), JSON.stringify({ cells, hint }));
    }
    checked++;
  }
  assert.ok(advised > 100);
  assert.ok(checked > 100);
  console.log(`Binary oracle: ${advised} sound hints; ${checked} arbitrary local positions`);
});

test('official binary hint walks preserve givens and never consult stored solutions', () => {
  let steps = 0;
  for (const input of load(process.cwd(), false).puzzles.filter((p) => p.type === 'binary')) {
    const p = new Proxy(input, {
      get(target, key) {
        if (key === 'solution') throw Error('Hint used the answer');
        return target[key];
      },
    });
    let state = C.registry.binary.initial(p);
    for (let step = 0; step < p.size ** 2; step++) {
      const before = structuredClone(state),
        hint = I.deduction(p, state);
      assert.deepEqual(state, before);
      if (!hint) break;
      assert.notEqual(hint.value, undefined, p.id);
      assert.equal(hint.value, input.solution[hint.cells[0]], p.id);
      assert.equal(p.givens[hint.cells[0]], -1);
      state = C.registry.binary.reduce(p, state, {
        type: 'set',
        cell: hint.cells[0],
        value: hint.value,
      });
      steps++;
    }
  }
  assert.ok(steps > 0);
  console.log(`Official binary deductions: ${steps}`);
});

test('empty maximum-size boards stop at a bounded local check, not puzzle search', () => {
  const p = puzzle(8),
    state = C.registry.binary.initial(p);
  const validate = C.registry.binary.validate,
    solve = C.solve;
  let calls = 0;
  try {
    C.solve = () => {
      throw Error('Hint started a puzzle solver');
    };
    C.registry.binary.validate = (...args) => {
      calls++;
      return validate(...args);
    };
    assert.equal(I.deduction(p, state), null);
    assert.ok(calls <= 1 + 2 * 64 + 8 * 8);
  } finally {
    C.registry.binary.validate = validate;
    C.solve = solve;
  }
});

test('wrong C3 on binary-03 reports B3 conflict without changing play', () => {
  const input = load(process.cwd(), false).puzzles.find((p) => p.id === 'binary-03');
  const p = new Proxy(input, {
    get(target, key) {
      if (key === 'solution') throw Error('Hint consulted the answer');
      return target[key];
    },
  });
  const state = C.registry.binary.reduce(p, C.registry.binary.initial(p), {
    type: 'set',
    cell: 14,
    value: 1,
  });
  assert.ok(localRules(state.cells, p.size));
  const before = structuredClone(state),
    hint = I.deduction(p, state);
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.equal(hint.value, undefined);
  assert.match(hint.message, /B3/);
  assert.deepEqual(state, before);
});
