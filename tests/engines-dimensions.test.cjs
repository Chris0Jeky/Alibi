'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');

test('aquarium reduce returns state unchanged when levels length mismatches definition', () => {
  const p = { type: 'aquarium', size: 2, tanks: [0, 0, 0, 0] };
  const s = { levels: [0, 0], notes: {} };
  const snapshot = C.clone(s);
  let out;
  assert.doesNotThrow(() => {
    out = C.registry.aquarium.reduce(p, s, { type: 'level', tank: 1, value: 0 });
  });
  assert.equal(out, s, 'mismatched levels must return the original state reference');
  assert.deepEqual(s, snapshot, 'input state must not be mutated');
  assert.equal(s.levels.length, 2, 'levels must not grow');
});

test('dossier mark returns state unchanged when marks length mismatches definition', () => {
  const n = 3;
  const p = { type: 'dossier', size: n };
  const s = { marks: [-1, -1, -1, -1, -1, -1], notes: {}, clueMarks: [], accused: null };
  const snapshot = C.clone(s);
  let out;
  assert.doesNotThrow(() => {
    out = C.registry.dossier.reduce(p, s, { type: 'mark', cell: 5, value: 1 });
  });
  assert.equal(out, s, 'mismatched marks must return the original state reference');
  assert.deepEqual(s, snapshot, 'input state must not be mutated');
  assert.equal(s.marks.length, 6, 'marks must not grow');
});

test('network rotate returns state unchanged when rotations length mismatches definition', () => {
  const p = { type: 'network', size: 2, tiles: [1, 1, 1, 1], source: 0, locked: [] };
  const s = { rotations: [0, 0], notes: {} };
  const snapshot = C.clone(s);
  let out;
  assert.doesNotThrow(() => {
    out = C.registry.network.reduce(p, s, { type: 'rotate', cell: 3 });
  });
  assert.equal(out, s, 'mismatched rotations must return the original state reference');
  assert.deepEqual(s, snapshot, 'input state must not be mutated');
  assert.equal(s.rotations.length, 2, 'rotations must not grow');
});
