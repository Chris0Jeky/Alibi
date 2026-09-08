'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Q = require('../src/quiet-wing/engine.js');
const E = require('../src/club-engines.js');
const Challenges = require('../src/challenges.js');
const Store = require('../src/challenge-storage.js');
const raw = ['classics', 'warehouse', 'reversi', 'borough'].flatMap(
  (n) => JSON.parse(fs.readFileSync(`content/challenges/${n}.json`)).challenges,
);
test('session fallback saves only validated replay records without affecting legacy state', async () => {
  const registry = Challenges.create(raw, { quiet: Q, club: E });
  const store = Store.create(registry);
  await store.open();
  const run = registry.begin('curated-classic-hanoi-01');
  run.log.push({ from: 1, to: 2 });
  await store.write(run);
  assert.deepEqual(await store.read(run.challengeId), run);
  const next = structuredClone(run);
  next.log.push({ from: 0, to: 1 });
  await store.write(next);
  assert.equal((await store.read(next.challengeId)).log.length, 2);
  await assert.rejects(store.restore(registry.begin(next.challengeId)), /transactional/);
  assert.equal((await store.read(next.challengeId)).log.length, 2);
  run.startingStateHash = 'changed';
  assert.throws(() => store.write(run), /trusted definition/);
  const legacy = Q.classicInitial('hanoi3');
  assert.equal(Q.classicMove(legacy, { from: 0, to: 2 }).state.moves, 1);
});
