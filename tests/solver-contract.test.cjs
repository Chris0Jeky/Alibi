'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const catalogue = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../content/catalog.json'), 'utf8'),
);

function puzzle(type) {
  return catalogue.puzzles.find((candidate) => candidate.type === type);
}

test('definition solving is explicit and retains published uniqueness', () => {
  for (const type of C.TYPES) {
    const current = puzzle(type);
    const result = C.solveDefinition(current, 2, type === 'bridges' ? 100000 : 250000);
    assert.equal(result.solutions.length, 1, type);
  }
});

test('solver capabilities identify only aquarium and network as definition-only', () => {
  for (const type of C.TYPES) {
    const capabilities = C.solverCapabilities(type);
    assert.equal(capabilities.definition, true, type);
    assert.equal(
      capabilities.stateConstraints,
      !['aquarium', 'network'].includes(type),
      type,
    );
  }
});

test('aquarium and network reject state-constrained solving instead of ignoring state', () => {
  for (const type of ['aquarium', 'network']) {
    const current = puzzle(type);
    const state = C.registry[type].initial(current);
    const snapshot = C.clone(state);
    assert.throws(
      () => C.solveState(current, state),
      new RegExp(`${type}.*definition-only.*state constraints`, 'i'),
    );
    assert.deepEqual(state, snapshot, `${type} state remains immutable`);
    assert.equal(C.solveDefinition(current).solutions.length, 1, type);
  }
});

test('state-constrained solving validates and narrows supported families', () => {
  const current = catalogue.puzzles.find(
    (candidate) => candidate.type === 'sudoku' && candidate.size === 4,
  );
  const state = C.registry.sudoku.initial(current);
  const blank = state.cells.findIndex((value) => value === 0);
  state.cells[blank] = current.solution[blank];
  const result = C.solveState(current, state);
  assert.equal(result.solutions.length, 1);
  assert.deepEqual(result.solutions[0], current.solution);

  const invalid = C.clone(C.registry.sudoku.initial(current));
  const row = Math.floor(blank / current.size);
  const duplicate = invalid.cells
    .slice(row * current.size, (row + 1) * current.size)
    .find((value) => value > 0);
  assert.ok(duplicate, 'fixture row has a printed clue');
  invalid.cells[blank] = duplicate;
  assert.equal(C.solveState(current, invalid).solutions.length, 0);
});

test('state-constrained solving requires a validated state object', () => {
  const current = puzzle('sudoku');
  assert.throws(() => C.solveState(current, null), /state object/i);
  assert.throws(
    () => C.solveState(current, { cells: [], notes: {} }),
    /Invalid grid save/,
  );
});
