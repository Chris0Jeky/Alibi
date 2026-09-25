'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { session, fresh } = require('./helpers/club-session.cjs');
test('confirmed Block restart changes seed even with a frozen clock and random source', async () => {
  const data = fresh();
  data.runs.blockcabinet = { seed: 'BLOCK-01', log: [{ slot: 0, cell: 0 }], redo: [] };
  // Use an empty legal run: seed freshness must not depend on having played a move.
  data.runs.blockcabinet.log = [];
  const tab = await session(data);
  const seen = new Set(['BLOCK-01']);
  for (let i = 0; i < 12; i++) {
    const before = tab.state();
    await tab.action('restart', { id: 'blockcabinet' });
    assert.deepEqual(tab.state(), before, 'opening/cancelling confirmation changes nothing');
    await tab.action('reset-confirm');
    const run = tab.state().runs.blockcabinet;
    assert.match(run.seed, /^[A-Z0-9_-]{1,32}$/);
    assert.equal(seen.has(run.seed), false);
    seen.add(run.seed);
    assert.deepEqual(run.log, []);
    assert.deepEqual(run.redo, []);
    assert.equal(tab.context.__clubReset, undefined);
  }
});
test('explicit Block seed replay is unchanged and reload retains the new seed', async () => {
  const tab = await session();
  await tab.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  tab.nodes.set('block-seed', { value: 'MY-STUDY' });
  await tab.action('block-use-seed');
  await tab.action('reset-confirm');
  assert.equal(tab.state().runs.blockcabinet.seed, 'MY-STUDY');
  await tab.action('restart', { id: 'blockcabinet' });
  await tab.action('reset-confirm');
  const seed = tab.state().runs.blockcabinet.seed;
  const restored = await session(tab.state());
  assert.equal(restored.state().runs.blockcabinet.seed, seed);
  tab.nodes.set('block-seed', { value: 'MY-STUDY' });
  await tab.action('block-use-seed');
  await tab.action('reset-confirm');
  assert.equal(tab.state().runs.blockcabinet.seed, 'MY-STUDY');
});
test('a protected unreadable save refuses a reset without replacing its stored bytes', async () => {
  const raw = JSON.stringify({ rev: 1, data: { schema: 500 } }),
    tab = await session(null, raw);
  await tab.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  const before = tab.state();
  await tab.action('restart', { id: 'blockcabinet' });
  await tab.action('reset-confirm');
  assert.deepEqual(tab.state(), before);
  assert.equal(tab.storage.get('alibi-afterhours-v1'), raw);
  assert.ok(tab.messages.some((m) => /save|storage/i.test(m)));
});
test('a new session-only game can restart and select strength without touching a protected save', async () => {
  const tab = await session(fresh(), null, { unavailable: true });
  await tab.club.onRoute({ page: 'salon', id: 'blockcabinet' });
  const seed = tab.state().runs.blockcabinet.seed;
  assert.equal(tab.club.diagnostics().storageMode, 'session');
  await tab.action('restart', { id: 'blockcabinet' });
  await tab.action('reset-confirm');
  assert.notEqual(tab.state().runs.blockcabinet.seed, seed);
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  await tab.action('duel-strength', { value: 'learner' });
  assert.equal(tab.state().runs.duel.difficulty, 'learner');
});
