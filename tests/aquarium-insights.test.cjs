'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
require('../src/core.js');
const C = require('../src/engines.js'),
  I = require('../src/insights.js');

function irregular() {
  return {
    type: 'aquarium',
    size: 3,
    tanks: [0, 0, 1, 0, 2, 1, 2, 2, 1],
    rowTargets: [0, 2, 3],
    colTargets: [2, 1, 2],
  };
}
function hidden(p) {
  return new Proxy(p, {
    get(target, key) {
      if (key === 'solution') throw Error('The hidden solution was consulted');
      return target[key];
    },
  });
}

test('public clues explain a forced irregular-tank waterline without reading the answer', () => {
  const p = irregular(),
    s = C.registry.aquarium.initial(p),
    before = structuredClone({ p, s }),
    hint = I.deduction(hidden(p), s);
  assert.ok(hint, 'the public clues force a useful waterline');
  assert.equal(hint.tank, 0);
  assert.equal(hint.level, 1);
  assert.deepEqual(hint.cells, [0, 1, 3]);
  assert.match(hint.message, /Row|Column/);
  assert.match(hint.message, /A1/);
  assert.equal(Object.hasOwn(hint, 'value'), false, 'Club must not apply a tank level as a cell');
  assert.deepEqual({ p, s }, before);
});

test('an overfull player row still gets the existing conflict before a deduction', () => {
  const p = irregular(),
    s = { levels: [2, 0, 0], notes: {} };
  const hint = I.deduction(hidden(p), s);
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.match(hint.message, /Row 1.*too much water/);
  assert.equal(Object.hasOwn(hint, 'value'), false);
});

// Independent tiny model: enumerate water heights, then count individual squares.
// Do not call the production geometry, solver, validation or propagation helpers.
function models(tanks, n) {
  const count = Math.max(...tanks) + 1,
    heights = Array.from({ length: count }, (_, t) =>
      [...new Set(tanks.flatMap((v, i) => v === t ? [Math.floor(i / n)] : []))]
        .sort((a, b) => a - b),
    ),
    all = [];
  function visit(levels) {
    const t = levels.length;
    if (t < count) {
      for (let level = 0; level <= heights[t].length; level++) visit([...levels, level]);
      return;
    }
    const rows = Array(n).fill(0), cols = Array(n).fill(0);
    for (let i = 0; i < tanks.length; i++) {
      const tank = tanks[i], row = Math.floor(i / n),
        surface = heights[tank][heights[tank].length - levels[tank]];
      if (levels[tank] && row >= surface) {
        rows[row]++;
        cols[i % n]++;
      }
    }
    all.push({ levels, rows, cols });
  }
  visit([]);
  return all;
}

test('exhaustive tiny irregular models prove every claimed level and reject inconsistent clues', (t) => {
  const shapes = [
    irregular().tanks,
    [0, 0, 1, 2, 0, 1, 2, 2, 1],
    [0, 1, 2, 3, 4, 2, 5, 5, 2],
  ], vectors = [];
  for (let a = 0; a <= 3; a++)
    for (let b = 0; b <= 3; b++)
      for (let c = 0; c <= 3; c++) vectors.push([a, b, c]);
  let claims = 0, inconsistent = 0, ambiguous = 0, zero = 0, full = 0;
  for (const tanks of shapes) {
    const all = models(tanks, 3), byClues = new Map();
    for (const model of all) {
      const key = [...model.rows, ...model.cols].join(',');
      if (!byClues.has(key)) byClues.set(key, []);
      byClues.get(key).push(model.levels);
    }
    for (const rowTargets of vectors)
      for (const colTargets of vectors) {
        if (rowTargets.reduce((a, b) => a + b) !== colTargets.reduce((a, b) => a + b)) continue;
        const p = { type: 'aquarium', size: 3, tanks, rowTargets, colTargets },
          valid = byClues.get([...rowTargets, ...colTargets].join(',')) || [],
          count = Math.max(...tanks) + 1,
          // These marks are deliberately unrelated to the clues, never premises.
          states = [Array(count).fill(0), Array(count).fill(1),
            ...Array.from({ length: count }, (_, wet) => Array.from({ length: count }, (_, t) => +(t === wet)))];
        if (!valid.length) inconsistent++;
        if (valid.length > 1) ambiguous++;
        for (const levels of states) {
          const s = { levels, notes: { 0: 'player note' } },
            before = JSON.stringify({ p, s }), hint = I.deduction(hidden(p), s);
          assert.equal(JSON.stringify({ p, s }), before);
          if (!hint || hint.rule === 'Revisit a conflict') continue;
          const detail = JSON.stringify({ p, s, hint });
          assert.ok(valid.length, 'no deduction from inconsistent public clues: ' + detail);
          assert.ok(valid.every((model) => model[hint.tank] === hint.level), detail);
          assert.notEqual(hint.level, levels[hint.tank], 'only useful guidance');
          assert.deepEqual(hint.cells, tanks.flatMap((t, i) => t === hint.tank ? [i] : []));
          assert.ok(hint.clues.length > 0);
          assert.equal(Object.hasOwn(hint, 'value'), false);
          claims++;
          if (!hint.level) zero++;
          if (hint.level === Math.max(...all.map((m) => m.levels[hint.tank]))) full++;
        }
      }
  }
  assert.ok(claims > 50 && inconsistent > 500 && ambiguous > 0 && zero > 0 && full > 0,
    JSON.stringify({ claims, inconsistent, ambiguous, zero, full }));
  t.diagnostic(JSON.stringify({ claims, inconsistent, ambiguous, zero, full }));
});

test('the irregular deduction combines public lines and skips already satisfied levels', () => {
  const p = irregular(), all = models(p.tanks, p.size),
    hint = I.deduction(hidden(p), { levels: [0, 1, 0] });
  assert.equal(hint.tank, 0);
  assert.equal(hint.level, 1);
  assert.ok(hint.clues.length > 1);
  for (let line = 0; line < 6; line++) {
    const axis = line < 3 ? 'rows' : 'cols', target = [...p.rowTargets, ...p.colTargets][line];
    assert.ok(all.some((m) => m[axis][line % 3] === target && m.levels[0] !== 1),
      'no single line alone forces this level');
  }
  const next = I.deduction(hidden(p), { levels: [1, 1, 0] });
  assert.equal(next.tank, 1);
  assert.equal(next.level, 2);
  assert.equal(I.deduction(hidden(p), { levels: [1, 2, 1] }), null);
});

test('ambiguity, impossible totals and unsupported geometry fall back honestly', () => {
  const ambiguous = { type: 'aquarium', size: 3,
    tanks: [0, 1, 2, 3, 4, 2, 5, 5, 2], rowTargets: [1, 1, 0], colTargets: [1, 1, 0] };
  assert.equal(models(ambiguous.tanks, 3).filter((m) =>
    m.rows.join() === ambiguous.rowTargets.join() && m.cols.join() === ambiguous.colTargets.join(),
  ).length, 2);
  assert.equal(I.deduction(hidden(ambiguous), { levels: Array(6).fill(0) }), null);
  assert.equal(I.deduction(hidden({ ...irregular(), tanks: Array(9).fill(0),
    rowTargets: [1, 1, 1], colTargets: [1, 1, 1] }), { levels: [0] }), null);
  for (const changes of [
    { size: 8 }, { tanks: [0] }, { tanks: Array(9).fill(1) },
    { tanks: [0, 1, 0, 1, 1, 1, 1, 1, 1] },
    { rowTargets: [0, 0, 0] }, { colTargets: [NaN, 1, 2] },
  ]) assert.equal(I.deduction(hidden({ ...irregular(), ...changes }), { levels: [0, 0, 0] }), null);
  for (const levels of [undefined, [], [-1, 0, 0], [0.5, 0, 0], [3, 0, 0], Array(3)])
    assert.equal(I.deduction(hidden(irregular()), { levels }), null);
});

test('even a one-square tank has no applicable Club cell value', () => {
  const p = { type: 'aquarium', size: 3, tanks: [0, 1, 1, 1, 1, 1, 1, 1, 1],
    rowTargets: [1, 0, 0], colTargets: [1, 0, 0] },
    hint = I.deduction(hidden(p), { levels: [0, 0] });
  assert.deepEqual(hint.cells, [0]);
  assert.equal(hint.level, 1);
  assert.equal(Object.hasOwn(hint, 'value'), false);
});

test('standard and Expert fixtures give deterministic, useful, solution-blind guidance', () => {
  const standard = require('../content/catalog.json').puzzles.find((p) => p.type === 'aquarium'),
    expert = require('../content/extra/expert-families.json').puzzles.find((p) => p.id === 'expert-aquarium-01');
  for (const p of [standard, expert]) {
    const s = C.registry.aquarium.initial(p), before = structuredClone(s),
      hint = I.deduction(hidden(p), s);
    assert.ok(hint && hint.level > 0, p.id);
    assert.equal(hint.level, p.solution[hint.tank]);
    assert.match(hint.message, /Row|Column/);
    assert.match(hint.message, /other tanks.*leaving/);
    assert.match(hint.message, /bottom .*Row/);
    const { solution, ...publicPuzzle } = p;
    assert.deepEqual(I.deduction(publicPuzzle, s), hint);
    assert.deepEqual(I.deduction({ ...publicPuzzle, solution: [] }, s), hint);
    assert.deepEqual(I.deduction({ ...publicPuzzle, solution: solution.map(() => 7) }, s), hint);
    assert.deepEqual(I.deduction(hidden(p), s), hint);
    assert.deepEqual(s, before);
  }
});

test('the largest supported board terminates with a public-clue deduction', { timeout: 1000 }, () => {
  const levels = [0, 1, 2, 3, 4, 5, 7],
    p = { type: 'aquarium', size: 7, tanks: Array.from({ length: 49 }, (_, i) => i % 7),
      rowTargets: Array.from({ length: 7 }, (_, r) => levels.filter((v) => v >= 7 - r).length),
      colTargets: levels }, s = { levels: Array(7).fill(0) };
  const hint = I.deduction(hidden(p), s);
  assert.equal(hint.tank, 1);
  assert.equal(hint.level, 1);
});
