'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const { load } = require('../tools/official-catalogue.cjs');

const pack = JSON.parse(fs.readFileSync('content/extra/sudoku-expert.json', 'utf8'));

test('Expert Sudoku pack is additive, provisional and uniquely solved', () => {
  assert.equal(pack.puzzles.length, 3);
  assert.equal(new Set(pack.puzzles.map((p) => p.id)).size, 3);
  assert.equal(new Set(pack.puzzles.map((p) => p.givens.join(','))).size, 3);
  const catalogue = load();
  const previousTricky = catalogue.puzzles
    .filter((p) => p.type === 'sudoku' && p.difficulty === 'Tricky' && p.size === 9)
    .map((p) => C.solve(p, null, 2, 250000).nodes);
  const hardestTricky = Math.max(...previousTricky);
  for (const p of pack.puzzles) {
    C.validateDefinition(p);
    const result = C.solve(p, null, 2, 250000);
    assert.equal(result.solutions.length, 1, `${p.id} is unique`);
    assert.equal(result.solutions[0].join(','), p.solution.join(','), `${p.id} matches its answer`);
    assert.equal(p.difficulty, 'Expert');
    assert.equal(p.difficultyStatus, 'provisional');
    assert.ok(result.nodes > hardestTricky, `${p.id} has a deeper bounded search than Tricky`);
  }
});
