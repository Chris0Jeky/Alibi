'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/club-engines.js');
require('../src/backup-validation.js');
const { session, fresh } = require('./helpers/club-session.cjs');
test('four explicit strengths retain legacy depth four and reject unknown values', () => {
  assert.equal(typeof E.reversi.strength, 'function');
  assert.deepEqual(Object.keys(E.reversi.strengths), ['learner', 'club', 'keeper', 'expert']);
  assert.equal(E.reversi.strength().depth, 4);
  assert.deepEqual(
    Object.keys(E.reversi.strengths).map((x) => E.reversi.strength(x).depth),
    [1, 3, 4, 5],
  );
  for (const value of [null, 'constructor', '__proto__', 'unknown', 1])
    assert.throws(() => E.reversi.strength(value));
});
test('strength selection reaches worker, and changing strength cancels its stale reply', async () => {
  const tab = await session();
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  await tab.action('duel-strength', { value: 'learner' });
  assert.equal(tab.state().runs.duel.difficulty, 'learner');
  await tab.action('duel-cell', { cell: '8' });
  tab.club.afterRender({ page: 'salon', id: 'duel' });
  const worker = tab.workers[0];
  assert.equal(worker.request.depth, 1);
  const before = tab.state();
  await tab.action('duel-strength', { value: 'expert' });
  assert.deepEqual(tab.state(), before, 'selection needs confirmation during a game');
  await tab.action('reset-confirm');
  assert.ok(worker.terminated);
  const next = tab.state();
  worker.onmessage({ data: { id: worker.request.id, cell: 9 } });
  assert.deepEqual(tab.state(), next, 'cancelled worker cannot modify the replacement run');
  assert.equal(next.runs.duel.difficulty, 'expert');
  assert.equal(next.runs.duel.log.length, 0);
  const source = await tab.blobs[0].text();
  assert.match(source, /reversi\.best\(e\.data\.state,e\.data\.depth\)/);
});
test('old and selected-strength saves round trip while invalid strengths are refused', async () => {
  const tab = await session();
  const data = fresh();
  data.runs.duel = { mode: 'bot', log: [8], redo: [] };
  assert.deepEqual(JSON.parse(JSON.stringify(await tab.club.validateBackup(data))), data);
  for (const difficulty of ['learner', 'club', 'keeper', 'expert']) {
    data.runs.duel.difficulty = difficulty;
    const restored = await session(data);
    assert.equal(restored.state().runs.duel.difficulty, difficulty);
  }
  data.runs.duel.difficulty = 'constructor';
  await assert.rejects(tab.club.validateBackup(data), /strength/i);
});
test('mode switching and ordinary restart retain the selected strength', async () => {
  const tab = await session();
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  await tab.action('duel-strength', { value: 'club' });
  await tab.action('duel-mode', { value: 'local' });
  await tab.action('duel-mode', { value: 'bot' });
  assert.equal(tab.state().runs.duel.difficulty, 'club');
  await tab.action('restart', { id: 'duel' });
  await tab.action('reset-confirm');
  assert.equal(tab.state().runs.duel.difficulty, 'club');
});

test('Learner and Expert choose different legal moves in a reachable position', () => {
  const state = E.reversi.move(E.reversi.initial(), 13);
  const before = JSON.stringify(state);
  const learner = E.reversi.best(state, E.reversi.strength('learner').depth);
  const expert = E.reversi.best(state, E.reversi.strength('expert').depth);
  assert.equal(learner.cell, 19);
  assert.equal(expert.cell, 9);
  assert.ok(E.reversi.legal(state).includes(expert.cell));
  assert.ok(expert.nodes > learner.nodes);
  assert.equal(JSON.stringify(state), before);
});
test('a late error from a cancelled opponent cannot stop the replacement worker', async () => {
  const tab = await session();
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  await tab.action('duel-cell', { cell: '8' });
  tab.club.afterRender({ page: 'salon', id: 'duel' });
  const old = tab.workers.at(-1);
  await tab.action('duel-strength', { value: 'expert' });
  await tab.action('reset-confirm');
  await tab.action('duel-cell', { cell: '8' });
  tab.club.afterRender({ page: 'salon', id: 'duel' });
  const current = tab.workers.at(-1);
  assert.notEqual(old, current);
  const before = tab.state();
  old.onerror(new Error('late delivery'));
  assert.equal(current.terminated, false);
  assert.equal(tab.club.diagnostics().botPending, true);
  assert.deepEqual(tab.state(), before);
});
