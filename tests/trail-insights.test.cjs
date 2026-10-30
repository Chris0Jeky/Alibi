'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
require('../src/core.js');
const C = require('../src/engines.js'),
  I = require('../src/insights.js');
const registry = require('../content/official-packs.json');
const trails = registry.packs
  .flatMap((file) => require('../content/' + file).puzzles || [])
  .filter((p) => p.type === 'trail');
const hidden = (p) =>
  new Proxy(p, {
    get(target, key) {
      if (key === 'solution') throw Error('Solution consulted');
      return target[key];
    },
  });

test('every official trail follows sound hints without reading the answer', () => {
  let steps = 0;
  for (const p of trails) {
    const s = C.registry.trail.initial(p);
    for (let step = 0; step < p.size ** 2; step++) {
      const hint = I.deduction(hidden(p), s);
      if (!hint || hint.value === undefined) break;
      assert.equal(hint.value, p.solution[hint.cells[0]], `${p.id}: ${hint.message}`);
      s.cells[hint.cells[0]] = hint.value;
      steps++;
    }
  }
  // Measured 215 steps; before #821 trails had no reasoning hints at all.
  assert.ok(steps >= 200, `${steps} hint steps`);
});

test('most fresh official trails offer a reasoning hint', () => {
  const offered = trails.filter(
    (p) => I.deduction(hidden(p), C.registry.trail.initial(p))?.value !== undefined,
  ).length;
  // Measured 27 of 44.
  assert.ok(offered >= 27, `${offered} of ${trails.length}`);
});

test('a gap between two placed numbers with one square in reach is filled', () => {
  // 3x3: 1 at A1 and 3 at C1. 2 must be within one step of both: only B1.
  const p = { type: 'trail', size: 3, givens: [1, 0, 3, 0, 0, 0, 0, 0, 0] },
    hint = I.deduction(p, C.registry.trail.initial(p));
  assert.equal(hint.rule, 'Only one square in reach');
  assert.deepEqual([hint.cells[0], hint.value], [1, 2]);
  assert.match(hint.message, /within 1 step of 1 at A1 and within 1 step of 3 at C1/);
});

test('a square only one missing number can reach takes it', () => {
  // On this fresh board every missing number has several squares in reach, but D1 has one number.
  const p = trails.find((t) => t.id === 'curated-trail-06'),
    hint = I.deduction(hidden(p), C.registry.trail.initial(p));
  assert.equal(hint.rule, 'Only one number reaches');
  assert.equal(hint.value, p.solution[hint.cells[0]]);
  assert.match(hint.message, /15 is the only missing number that can reach D1/);
});

test('numbers placed too far apart ask for a correction', () => {
  // 1 at A1 and 3 at C3 on a 3x3: 2 cannot be within one step of both.
  const p = { type: 'trail', size: 3, givens: [1, 0, 0, 0, 0, 0, 0, 0, 3] },
    hint = I.deduction(p, C.registry.trail.initial(p));
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.match(hint.message, /where 2 must go/);
});
