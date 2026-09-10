'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');

const pack = JSON.parse(fs.readFileSync('content/extra/expert-families.json', 'utf8'));
const expectedTypes = [
  'scene',
  'dossier',
  'witness',
  'nonogram',
  'lightup',
  'tents',
  'aquarium',
  'network',
  'trail',
  'binary',
  'futoshiki',
  'bridges',
];

test('provisional Expert family pack covers each remaining family with one unique puzzle', () => {
  assert.equal(pack.puzzles.length, expectedTypes.length);
  assert.deepEqual(
    pack.puzzles.map((p) => p.type),
    expectedTypes,
  );
  assert.equal(new Set(pack.puzzles.map((p) => p.id)).size, pack.puzzles.length);

  for (const p of pack.puzzles) {
    assert.equal(p.difficulty, 'Expert', p.id);
    assert.equal(p.difficultyStatus, 'provisional', p.id);
    assert.match(p.difficultyEvidence, /^.{1,240}$/s, p.id);
    C.validateDefinition(p);
    const result = C.solve(p, null, 2, p.type === 'bridges' ? 100000 : 250000);
    assert.equal(result.solutions.length, 1, `${p.id} is unique`);
    assert.deepEqual(result.solutions[0], p.solution, `${p.id} matches its answer`);
  }
});
