'use strict';
// Regression pin for Voices queue limits (src/voices-queue.js): the queue holds at
// most twenty waiting items, a newer survey answer replaces the queued answer for
// the same survey/subject without growing the queue, and a 400 refusal removes the
// item while leaving a local note. Test-only; no queue policy changes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/voices-queue.js'), 'utf8');
const COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev';
const T0 = Date.parse('2026-09-27T10:00:00Z');

function locks() {
  let tail = Promise.resolve();
  return {
    request(_name, fn) {
      const next = tail.then(fn);
      tail = next.catch(() => {});
      return next;
    },
  };
}

function storage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

function harness({ replies = [], store = storage() } = {}) {
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'voices-queue.js' });
  const calls = [];
  const clock = { t: T0 };
  let n = 0;
  const state = { replies };
  const q = context.AlibiVoicesQueue({
    locks: locks(),
    storage: store,
    now: () => clock.t,
    uuid: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    collector: COLLECTOR,
    online: () => true,
    fetch: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      const reply = state.replies.length ? state.replies.shift() : 202;
      if (reply === 'network') throw TypeError('Failed to fetch');
      return {
        status: typeof reply === 'object' ? reply.status : reply,
        headers: { get: () => null },
      };
    },
  });
  return { q, calls, clock, store };
}

const feedback = (q, extra = {}) =>
  q.feedback({
    kind: 'bug',
    route: 'puzzle',
    subject: 'vault-binary-04',
    text: 'Queue limit pin.',
    release: '0.15.0',
    device: 'mobile',
    ...extra,
  });

const rating = async (q, subject = 'scene-01', answers = { difficulty: 'just-right' }) =>
  await q.survey({
    survey: 'puzzle-rating',
    subject,
    answers,
    meta: { family: 'scene', tier: 'gentle' },
    release: '0.15.0',
    device: 'desktop',
  });

test('enqueue caps the queue at twenty: the 21st message is refused', async () => {
  const { q } = harness();
  assert.equal(q.MAX, 20, 'the published cap stays at twenty');
  for (let i = 0; i < 20; i += 1) {
    assert.equal(
      await q.enqueue(feedback(q, { text: `message ${i}` })),
      true,
      `message ${i} queues`,
    );
  }
  assert.equal(q.pending().length, 20);
  assert.equal(await q.enqueue(feedback(q, { text: 'one too many' })), false);
  assert.equal(q.pending().length, 20, 'the refused message does not displace anything waiting');
  assert.equal(
    q.pending()[0].payload.text,
    'message 0',
    'nothing waiting was displaced by the refusal',
  );
});

test('a newer survey answer for the same survey/subject replaces without growing the queue', async () => {
  const { q } = harness();
  const first = await rating(q, 'scene-01', { difficulty: 'too-easy' });
  assert.equal(await q.enqueue(first), true);
  assert.equal(q.pending().length, 1);
  const second = await rating(q, 'scene-01', { difficulty: 'too-hard' });
  assert.equal(await q.enqueue(second), true);
  assert.equal(q.pending().length, 1, 'replacement keeps the queue length unchanged');
  assert.equal(q.pending()[0].payload.answers.difficulty, 'too-hard');
  assert.equal(q.pending()[0].payload.revision, second.revision);
  const other = await rating(q, 'scene-02', { difficulty: 'just-right' });
  assert.equal(await q.enqueue(other), true);
  assert.equal(q.pending().length, 2, 'a different subject is kept, not replaced');
});

test('flush removes a 400 refusal and leaves a local could-not-be-sent note', async () => {
  const { q, calls } = harness({ replies: [400] });
  const message = feedback(q);
  assert.equal(await q.enqueue(message), true);
  await q.flush();
  assert.equal(calls.length, 1, 'the queued message was attempted once');
  assert.equal(q.pending().length, 0, 'a 400 refusal removes the item');
  assert.equal(q.outcome(message), 400);
  assert.deepEqual(JSON.parse(JSON.stringify(q.notes())), [
    { what: 'feedback', day: '2026-09-27' },
  ]);
});
