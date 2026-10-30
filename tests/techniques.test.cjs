'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path');
require('../src/core.js');
require('../src/engines.js');
require('../src/bridges.js');
require('../src/assist.js');
const I = require('../src/insights.js');
const official = require('../tools/official-catalogue.cjs').load(
  path.resolve(__dirname, '..'),
  false,
).puzzles;
const byId = (id) => official.find((p) => p.id === id);
const hidden = (p) =>
  new Proxy(p, {
    get(target, key) {
      if (key === 'solution') throw Error('Solution consulted');
      return target[key];
    },
  });

test('a Sudoku names the techniques its hints walk through (#835)', () => {
  const used = Object.fromEntries(I.techniques(hidden(byId('sudoku-04'))));
  assert.ok(used['Only one number fits'] > 0);
  assert.ok(used['Only one place for a number'] > 0);
});

test('placements, marks and values all count; corrections never do', () => {
  for (const id of ['trail-04', 'dossier-01', 'scene-04', 'nonogram-01']) {
    const used = I.techniques(hidden(byId(id)));
    assert.ok(Array.isArray(used), id);
    assert.ok(!used.some(([rule]) => /^Revisit/.test(rule)), id);
  }
  assert.ok(
    official.some((p) => p.type === 'scene' && I.techniques(hidden(p)).length),
    'scene placements count',
  );
});

test('every official puzzle can be summarised without reading the answer', () => {
  for (const p of official) I.techniques(hidden(p));
});

test('a puzzle the hint walk cannot handle yields no line instead of an error', () => {
  assert.deepEqual(I.techniques({ id: 'x', revision: 1, type: 'unknown', size: 3 }), []);
});
