'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('../src/core.js');
const core = globalThis.AlibiCore;
const validateCore = core.validatePack;
require('../src/engines.js');
const validateExtended = core.validatePack;
const catalogue = JSON.parse(fs.readFileSync('content/catalog.json', 'utf8'));
const sudoku = catalogue.puzzles.find((p) => p.type === 'sudoku' && p.size === 4);
const dossier = catalogue.puzzles.find((p) => p.type === 'dossier');
const bridges = catalogue.puzzles.find((p) => p.type === 'bridges');
const pack = (puzzles) => ({
  schemaVersion: 1,
  id: 'probe-pack',
  version: 1,
  title: 'Probe',
  puzzles,
});

test('core-only and extended pack APIs retain their own diagnostics', () => {
  const cases = [
    [null, 'Invalid pack header.', 'A valid pack needs an ID, title and 1–150 puzzles.'],
    [
      pack([]),
      'A pack must contain 1–150 puzzles.',
      'A valid pack needs an ID, title and 1–150 puzzles.',
    ],
    [pack([sudoku, sudoku]), 'Duplicate puzzle IDs in the pack.', 'Duplicate puzzle IDs.'],
  ];
  for (const [input, coreError, extendedError] of cases) {
    assert.throws(() => validateCore(input, false), { message: coreError });
    assert.throws(() => validateExtended(input, false), { message: extendedError });
  }
});

test('extended validation uses registered extra engines without changing core-only validation', () => {
  assert.ok(sudoku && dossier);
  const source = pack([sudoku, dossier]);
  const before = JSON.stringify(source);
  const output = validateExtended(source, false);
  assert.deepEqual(
    output.puzzles.map((p) => p.id),
    [sudoku.id, dossier.id],
  );
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(output.puzzles[0], sudoku);
  assert.throws(() => validateCore(pack([dossier]), false));
  assert.deepEqual(validateCore(pack([sudoku]), false).puzzles[0], sudoku);
});

test('uniqueness checks preserve the distinct solver dispatch and failure messages', () => {
  const originalSolve = core.solve;
  const originalSolveDefinition = core.solveDefinition;
  try {
    core.solve = () => ({ solutions: [{}, {}] });
    core.solveDefinition = () => ({ solutions: [{}, {}] });
    assert.throws(() => validateCore(pack([sudoku]), true), {
      message: `${sudoku.title}: expected one solution, found at least 2.`,
    });
    assert.throws(() => validateExtended(pack([sudoku]), true), {
      message: `${sudoku.title}: the rules do not identify exactly one solution.`,
    });
    core.solve = () => ({ solutions: [] });
    core.solveDefinition = () => ({ solutions: [{}] });
    assert.throws(() => validateCore(pack([sudoku]), true), {
      message: `${sudoku.title}: expected one solution, found 0.`,
    });
    assert.doesNotThrow(() => validateExtended(pack([sudoku]), true));
  } finally {
    core.solve = originalSolve;
    core.solveDefinition = originalSolveDefinition;
  }
});

test('captured extended validator resolves a Bridges engine registered later', () => {
  assert.ok(bridges);
  assert.throws(() => validateExtended(pack([bridges]), false));
  require('../src/bridges.js');
  assert.equal(validateExtended(pack([bridges]), false).puzzles[0].id, bridges.id);
  assert.throws(() => validateCore(pack([bridges]), false));
});
