import test from 'node:test';
import assert from 'node:assert/strict';
import * as Cascade from '../src/block-cabinet/cascade.mjs';
import {
  calibrateSeeds,
  searchSeed,
  stateKey,
  verifyReference,
} from '../src/block-cabinet/calibration.mjs';

const tinyBudget = Object.freeze({ maxNodes: 3, beamWidth: 2, branchWidth: 2 });

test('calibration keys separate every future-relevant Cascade value', () => {
  const state = Cascade.initial('KEY-CHECK');
  const mutations = [
    { board: state.board.with(0, 1) },
    { tray: state.tray.with(0, (state.tray[0] + 1) % Cascade.SHAPES.length) },
    { round: state.round + 1 },
    { turn: state.turn + 1 },
    { score: state.score + 1 },
    { charges: state.charges - 1 },
    { relics: state.relics + 1 },
    { goal: state.goal - 1 },
    { limit: state.limit - 1 },
  ];
  const key = stateKey(state);
  assert.equal(typeof key, 'string');
  assert.ok(key.length < 256);
  for (const patch of mutations) assert.notEqual(stateKey({ ...state, ...patch }), key);
});

test('bounded search is deterministic and never presents an unresolved seed as impossible', () => {
  const first = searchSeed('CALIBRATE-0', tinyBudget);
  const second = searchSeed('CALIBRATE-0', tinyBudget);
  assert.deepEqual(second, first);
  assert.equal(first.status, 'budget-exhausted');
  assert.equal(first.proven, false);
  assert.equal(first.reference, null);
  assert.ok(first.nodes <= tinyBudget.maxNodes);
  assert.ok(first.generated >= first.nodes);
  assert.doesNotMatch(JSON.stringify(first), /unsolvable|impossible/i);
});

test('batch calibration retains seed order and verifies every solved reference exactly', () => {
  const seeds = ['CALIBRATE-0', 'CALIBRATE-1', 'CALIBRATE-2'];
  const report = calibrateSeeds(seeds, tinyBudget);
  assert.equal(report.rules, Cascade.RULES);
  assert.deepEqual(
    report.results.map((result) => result.seed),
    seeds,
  );
  assert.equal(report.options.maxNodes, tinyBudget.maxNodes);
  assert.equal(report.summary.total, seeds.length);
  assert.equal(report.summary.solved + report.summary.unresolved, seeds.length);
  assert.equal(report.claimsHumanDifficulty, false);
  for (const result of report.results)
    if (result.status === 'solved')
      assert.deepEqual(verifyReference(result.reference), result.final);
});

test('reference verification and search limits fail closed', () => {
  assert.throws(() => verifyReference(Cascade.record('NOT-WON')), /winning Cascade replay/);
  assert.throws(() => searchSeed('CALIBRATE-0', { ...tinyBudget, maxNodes: 0 }), /maxNodes/);
  assert.throws(() => searchSeed('CALIBRATE-0', { ...tinyBudget, beamWidth: 0 }), /beamWidth/);
  assert.throws(() => searchSeed('CALIBRATE-0', { ...tinyBudget, branchWidth: 0 }), /branchWidth/);
  assert.throws(() => calibrateSeeds([], tinyBudget), /seed/);
  assert.throws(() => calibrateSeeds(['CALIBRATE-0', 'CALIBRATE-0'], tinyBudget), /duplicate/i);
});
