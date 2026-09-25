'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { session } = require('./helpers/club-session.cjs');
const E = require('../src/club-engines.js');
async function pending() {
  const tab = await session();
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  await tab.action('duel-cell', { cell: '8' });
  tab.club.afterRender({ page: 'salon', id: 'duel' });
  return tab;
}
for (const kind of ['error', 'message-error', 'malformed', 'illegal']) {
  test(`opponent ${kind} pauses until explicit retry without changing history`, async () => {
    const tab = await pending();
    const worker = tab.workers.at(-1),
      before = tab.state();
    if (kind === 'error') worker.onerror(new Error('failure'));
    else
      worker.onmessage({
        data:
          kind === 'malformed'
            ? null
            : {
                id: worker.request.id,
                ...(kind === 'message-error' ? { error: 'failure' } : { cell: 14 }),
              },
      });
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(tab.state(), before);
    assert.equal(tab.club.diagnostics().botPending, false);
    assert.match(tab.club.roomPage('duel'), /club-bot-retry/);
    for (let i = 0; i < 5; i++) tab.club.afterRender({ page: 'salon', id: 'duel' });
    assert.equal(tab.workers.length, 1, 'no automatic retry storm');
    await tab.action('bot-retry');
    tab.club.afterRender({ page: 'salon', id: 'duel' });
    assert.equal(tab.workers.length, 2);
    assert.equal(tab.workers[1].request.depth, 4);
  });
}
test('late or repeated worker replies after cleanup cannot throw or replay moves', async () => {
  const tab = await pending(),
    old = tab.workers[0];
  await tab.club.onRoute({ page: 'home' });
  assert.doesNotThrow(() => old.onmessage({ data: null }));
  assert.doesNotThrow(() => old.onerror(new Error('late')));
  assert.equal(tab.state().runs.duel.log.length, 1);
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  tab.club.afterRender({ page: 'salon', id: 'duel' });
  const worker = tab.workers.at(-1),
    cell = E.reversi.best(worker.request.state, 4).cell;
  worker.onmessage({ data: { id: worker.request.id, cell } });
  await new Promise((r) => setImmediate(r));
  const after = tab.state();
  assert.doesNotThrow(() => worker.onmessage({ data: { id: worker.request.id, cell } }));
  assert.deepEqual(tab.state(), after);
});
test('retry cannot start a worker off-route or during a live request', async () => {
  const tab = await pending();
  await tab.action('bot-retry');
  tab.club.afterRender({ page: 'salon', id: 'duel' });
  assert.equal(tab.workers.length, 1);
  tab.workers[0].onerror(new Error('failure'));
  await tab.club.onRoute({ page: 'home' });
  await tab.action('bot-retry');
  assert.equal(tab.workers.length, 1);
});
test('strength changes preserve keyboard focus', async () => {
  const tab = await session();
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  let focused = false;
  tab.nodes.set('club-control-duel-strength-expert', {
    focus() {
      focused = true;
    },
  });
  await tab.action('duel-strength', { value: 'expert' });
  assert.equal(focused, true);
});
