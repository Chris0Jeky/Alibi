'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const DEFINITION_ONLY = ['scene', 'dossier', 'bridges', 'aquarium', 'network'];
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

test('solver capabilities expose state constraints only when the full saved semantics are honored', () => {
  for (const type of C.TYPES) {
    const capabilities = C.solverCapabilities(type);
    assert.equal(capabilities.definition, true, type);
    assert.equal(capabilities.stateConstraints, !DEFINITION_ONLY.includes(type), type);
  }
});

test('definition-only families reject state-constrained solving instead of partially honoring state', () => {
  for (const type of DEFINITION_ONLY) {
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

test('Bridges zero values are not advertised as complete saved-state constraints', () => {
  const current = puzzle('bridges');
  const state = C.registry.bridges.initial(current);
  const solution = C.solveDefinition(current).solutions[0];
  assert.ok(
    solution.some((value, index) => value > 0 && state.cells[index] === 0),
    'initial zero edges include undecided bridges used by the solution',
  );
  assert.throws(() => C.solveState(current, state), /bridges.*definition-only/i);
});

test('Scene and Dossier wrong accusations cannot be treated as satisfiable state constraints', () => {
  const scene = puzzle('scene');
  const sceneState = C.registry.scene.initial(scene);
  sceneState.placements = C.clone(scene.solution);
  const culprit = C.murderer(scene, sceneState);
  sceneState.accused = scene.people.find(
    (person) => person.id !== scene.victim && person.id !== culprit,
  ).id;
  assert.equal(C.registry.scene.complete(scene, sceneState), false);
  assert.throws(() => C.solveState(scene, sceneState), /scene.*definition-only/i);

  const dossier = puzzle('dossier');
  const dossierState = C.registry.dossier.initial(dossier);
  const n = dossier.size;
  for (let category = 0; category < 2; category += 1) {
    for (let person = 0; person < n; person += 1) {
      const answer = dossier.solution[category * n + person];
      for (let value = 0; value < n; value += 1) {
        dossierState.marks[category * n * n + person * n + value] = value === answer ? 1 : 0;
      }
    }
  }
  const carrier = dossier.solution.slice(n).indexOf(dossier.targetItem);
  dossierState.accused = (carrier + 1) % n;
  assert.equal(C.registry.dossier.complete(dossier, dossierState), false);
  assert.throws(() => C.solveState(dossier, dossierState), /dossier.*definition-only/i);
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

test('Witness state constraints honor committed statement marks', () => {
  const current = puzzle('witness');
  const state = C.registry.witness.initial(current);
  const solution = C.solveDefinition(current).solutions[0];
  const truths = current.statements.map((statement) => Number(C.extras.truth(statement, solution)));
  const marked = truths.findIndex((value) => value === 0 || value === 1);
  assert.notEqual(marked, -1, 'fixture exposes at least one statement truth value');
  state.marks[marked] = truths[marked] === 1 ? 0 : 1;
  assert.equal(C.solveState(current, state).solutions.length, 0);
});

test('state-constrained solving requires a validated state object', () => {
  const current = puzzle('sudoku');
  assert.throws(() => C.solveState(current, null), /state object/i);
  assert.throws(() => C.solveState(current, { cells: [], notes: {} }), /Invalid grid save/);
});
