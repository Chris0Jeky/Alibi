'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const pack = require('../content/extra/nonogram-large.json');

function runs(line) {
  const out = [];
  let count = 0;
  for (const value of [...line, 0]) {
    if (value) count++;
    else if (count) {
      out.push(count);
      count = 0;
    }
  }
  return out.length ? out : [0];
}

// Independent row-enumeration oracle. It does not use the production clue or solver helpers.
function linePatterns(size, clues) {
  const out = [];
  for (let mask = 0; mask < 2 ** size; mask++) {
    const line = Array.from({ length: size }, (_, i) => (mask >> i) & 1);
    if (JSON.stringify(runs(line)) === JSON.stringify(clues)) out.push(line);
  }
  return out;
}

function independentSolutions(p, budget = 250000) {
  const n = p.size;
  const rows = p.rowClues.map((clues) => linePatterns(n, clues));
  const columns = p.colClues.map((clues) => linePatterns(n, clues));
  const found = [];
  let nodes = 0;
  function visit(rowIndex, chosen, available) {
    assert.ok(++nodes <= budget, `${p.id} independent search exceeded its node budget`);
    if (found.length >= 2) return;
    if (rowIndex === n) {
      found.push(chosen.flat());
      return;
    }
    for (const row of rows[rowIndex]) {
      const next = available.map((options, col) =>
        options.filter((candidate) => candidate[rowIndex] === row[col]),
      );
      if (next.every((options) => options.length)) visit(rowIndex + 1, [...chosen, row], next);
      if (found.length >= 2) return;
    }
  }
  visit(0, [], columns);
  return { found, nodes };
}

test('large nonogram pack contains bounded, unique 15x15 boards', () => {
  assert.equal(pack.puzzles.length, 4);
  assert.equal(new Set(pack.puzzles.map((p) => p.id)).size, pack.puzzles.length);
  C.validatePack(pack, false);
  for (const p of pack.puzzles) {
    assert.equal(p.size, 15, p.id);
    assert.equal(p.solution.length, 225, p.id);
    assert.equal(p.rowClues.length, 15, p.id);
    assert.equal(p.colClues.length, 15, p.id);
    const independent = independentSolutions(p);
    assert.deepEqual(independent.found, [p.solution], p.id);
    assert.ok(independent.nodes < 250000, `${p.id} independent search stayed bounded`);
    const native = C.solve(p, null, 2, 250000);
    assert.deepEqual(native.solutions, [p.solution], `${p.id} native solution`);
    assert.ok(native.nodes < 250000, `${p.id} native search stayed bounded`);
  }
});

test('large nonograms are accepted while larger nonograms and other families stay bounded', () => {
  for (const p of pack.puzzles) assert.doesNotThrow(() => C.validateDefinition(p), p.id);
  const tooLarge = { ...pack.puzzles[0], size: 16 };
  assert.throws(() => C.validateDefinition(tooLarge), /Unsupported grid size/);
  const catalogue = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../content/catalog.json'), 'utf8'),
  );
  for (const type of ['sudoku', 'binary', 'futoshiki']) {
    const p = { ...catalogue.puzzles.find((candidate) => candidate.type === type), size: 10 };
    assert.throws(() => C.validateDefinition(p), /Unsupported grid size/, type);
  }
});
