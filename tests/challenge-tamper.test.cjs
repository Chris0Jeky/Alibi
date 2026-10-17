'use strict';
// Tamper regression pins for the challenge run guards in src/challenges.js:
// validateRun rejects a run whose startingStateHash no longer matches the
// trusted definition, and the warehouse apply path rejects an illegal move
// (a step the engine answers with the unchanged state).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../src/quiet-wing/engine.js');
const E = require('../src/club-engines.js');
const Challenges = require('../src/challenges.js');
const catalogue = require('../tools/challenge-catalogue.cjs');

const registry = Challenges.create(catalogue.runtime(catalogue.load()), {
  quiet: Q,
  club: E,
});

const WAREHOUSE_ID = 'curated-archive-vault-01';

function flipHash(hash) {
  const last = hash.slice(-1);
  return hash.slice(0, -1) + (last === '0' ? '1' : '0');
}

test('tampered starting hash is rejected', () => {
  const run = registry.begin(WAREHOUSE_ID);
  assert.doesNotThrow(() => registry.validateRun(run), 'a fresh run is valid');
  const tampered = {
    ...run,
    log: [...run.log],
    startingStateHash: flipHash(run.startingStateHash),
  };
  assert.notEqual(tampered.startingStateHash, run.startingStateHash);
  assert.throws(() => registry.validateRun(tampered), /trusted definition/);
});

test('illegal warehouse action is rejected', () => {
  const run = registry.begin(WAREHOUSE_ID);
  const start = registry.replay(run).state;
  const blocked = ['up', 'right', 'down', 'left'].find((d) => E.warehouse.move(start, d) === start);
  assert.ok(blocked, 'expected a blocked direction from the vault start');
  const forged = { ...run, log: [blocked] };
  assert.throws(() => registry.validateRun(forged), /Illegal archive replay action/);
});
