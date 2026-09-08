'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Q = require('../src/quiet-wing/engine.js');
const E = require('../src/club-engines.js');
const Challenges = require('../src/challenges.js');
const files = ['classics', 'warehouse', 'reversi', 'borough'];
const raw = files.flatMap(
  (name) => JSON.parse(fs.readFileSync(`content/challenges/${name}.json`, 'utf8')).challenges,
);
const registry = Challenges.create(raw, { quiet: Q, club: E });

test('all 59 trusted definitions rebuild from their start and supplied replays', () => {
  assert.equal(registry.count, 59);
  for (const c of registry.entries()) {
    const run = registry.begin(c.id);
    const solution = c.solutionActions || c.solutionPath || c.principalVariation;
    run.log = typeof solution === 'string' ? [...solution] : structuredClone(solution);
    assert.equal(registry.replay(run).complete, true, c.id);
  }
});

test('saved challenge runs pin revision, starting state and objective instead of accepting boards', () => {
  const run = registry.begin('curated-classic-hanoi-01');
  run.log.push({ from: 1, to: 2 });
  assert.equal(registry.replay(run).state.moves, 1);
  for (const change of [
    (x) => (x.startingStateHash = '00000000'),
    (x) => (x.challengeRevision = 9),
    (x) => (x.objective.type = 'anything'),
    (x) => x.log.push({ from: 0, to: 0 }),
  ]) {
    const altered = structuredClone(run);
    change(altered);
    assert.throws(() => registry.replay(altered), /challenge|Illegal|Choose/i);
  }
});

test('fixed queens and knight prefixes reject replay edits while ordinary legacy runs stay independent', () => {
  const queens = registry.begin('curated-classic-queens-01');
  queens.log.push({ cell: 8 });
  assert.throws(() => registry.replay(queens), /fixed/i);
  const knight = registry.begin('curated-classic-knight-01');
  knight.log.push({ cell: 20 });
  assert.throws(() => registry.replay(knight), /fixed knight/i);
  const ordinary = Q.classicInitial('hanoi3');
  const next = Q.classicMove(ordinary, { from: 0, to: 2 });
  assert.ok(!next.error);
  assert.equal(ordinary.moves, 0);
});

test('registry refuses tampered starts before a challenge can be launched', () => {
  const bad = structuredClone(raw);
  bad.find((c) => c.id === 'curated-classic-sliding-01').startState.tiles = [
    1, 2, 3, 4, 5, 6, 8, 7, 0,
  ];
  assert.throws(() => Challenges.create(bad, { quiet: Q, club: E }), /Unreachable sliding/i);
  const map = structuredClone(raw);
  map.find((c) => c.id === 'curated-archive-01').map[0] = 'bad';
  assert.throws(() => Challenges.create(map, { quiet: Q, club: E }), /archive map/i);
});
