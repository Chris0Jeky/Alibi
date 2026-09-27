'use strict';
// The Voices queue and transport (src/voices-queue.js) with fake storage, fetch and clock.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/voices-queue.js'), 'utf8');
const COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev';
const MIN = 6e4;
const HOUR = 36e5;
const DAY = 864e5;
const T0 = Date.parse('2026-09-27T10:00:00Z');

function storage(initial = {}, { throws = false, full = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem(k) {
      if (throws) throw Error('SecurityError');
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (throws || full) throw Error('QuotaExceededError');
      map.set(k, String(v));
    },
    removeItem(k) {
      if (throws) throw Error('SecurityError');
      map.delete(k);
    },
  };
}

// A scripted collector: each call takes the next reply (a status, 'network' or a function).
function harness({ replies = [], store = storage(), online = true, timers = false, timeout } = {}) {
  const context = timers ? { AbortController, setTimeout, clearTimeout } : {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'voices-queue.js' });
  const calls = [];
  const clock = { t: T0 };
  let n = 0;
  const state = { online, replies };
  const q = context.AlibiVoicesQueue({
    storage: store,
    now: () => clock.t,
    uuid: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    collector: COLLECTOR,
    online: () => state.online,
    timeout,
    fetch: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      const reply = state.replies.length ? state.replies.shift() : 202;
      if (reply === 'network') throw TypeError('Failed to fetch');
      if (reply === 'hang')
        return new Promise((_, reject) =>
          init.signal?.addEventListener('abort', () => reject(Error('AbortError'))),
        );
      if (typeof reply === 'function') return reply();
      return {
        status: typeof reply === 'object' ? reply.status : reply,
        headers: { get: (h) => (h === 'retry-after' ? (reply.retryAfter ?? null) : null) },
      };
    },
  });
  return { q, calls, clock, store, state, context };
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const feedback = (q, extra = {}) =>
  q.feedback({
    kind: 'bug',
    route: 'puzzle',
    subject: 'vault-binary-04',
    text: "The last row won't accept a moon even though the row has room.",
    release: '0.15.0',
    device: 'mobile',
    ...extra,
  });
const rating = (q, subject = 'scene-01', answers = { difficulty: 'just-right' }) =>
  q.survey({
    survey: 'puzzle-rating',
    subject,
    answers,
    meta: { family: 'scene', tier: 'gentle' },
    release: '0.15.0',
    device: 'desktop',
  });
const taste = (q, answers) =>
  q.survey({
    survey: 'alibi-taste-1',
    answers: answers || { often: 'weekly', more: ['scene', 'sudoku'], difficulty: 'mostly-right' },
    release: '0.15.0',
    device: 'mobile',
  });

test('feedback is exactly the pulseboard.feedback/1 payload, cleaned and bounded', () => {
  const { q } = harness();
  assert.deepEqual(plain(feedback(q)), {
    v: 1,
    id: '00000000-0000-4000-8000-000000000001',
    release: '0.15.0',
    kind: 'bug',
    route: 'puzzle',
    subject: 'vault-binary-04',
    text: "The last row won't accept a moon even though the row has room.",
    written: '2026-09-27',
    context: { device: 'mobile' },
  });
  assert.deepEqual(Object.keys(feedback(q)), [
    'v',
    'id',
    'release',
    'kind',
    'route',
    'subject',
    'text',
    'written',
    'context',
  ]);
  assert.equal(
    feedback(q, { text: '  a\u0000b\u0007c\r\nd\te\u007f  ' }).text,
    'a b c \nd\te',
    'control characters other than newline and tab become spaces, then trimmed',
  );
  assert.equal(feedback(q, { text: '   \n\t ' }), null, 'empty after trimming is not sent');
  assert.equal(feedback(q, { text: 'a\u0085b\u009fc' }).text, 'a b c', 'C1 controls become spaces');
  assert.equal(
    feedback(q, { text: '\u0080\u009f' }),
    null,
    'C1-only text is empty, as for the collector',
  );
  assert.equal(feedback(q, { text: 'x'.repeat(2000) }).text.length, 2000);
  assert.equal(feedback(q, { text: 'x'.repeat(2001) }), null);
  assert.equal(feedback(q, { kind: 'rant' }), null);
  assert.equal(feedback(q, { device: 'watch' }), null);
  assert.equal(feedback(q, { release: 'not a release' }), null);
  assert.equal(feedback(q, { route: 'workshop' }).route, 'other');
  assert.equal(feedback(q, { subject: 'My Puzzle' }).subject, '', 'only catalogue-shaped ids');
  assert.equal(feedback(q, { subject: undefined }).subject, '');
  for (const kind of ['bug', 'idea', 'puzzle', 'praise', 'other'])
    assert.equal(feedback(q, { kind }).kind, kind);
  for (const route of ['home', 'puzzle', 'castle', 'quiet-wing', 'games', 'settings', 'other'])
    assert.equal(feedback(q, { route }).route, route);
});

test('without a random source nothing is built', () => {
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  const q = context.AlibiVoicesQueue({ storage: storage(), uuid: () => 'not-a-uuid' });
  assert.equal(feedback(q), null);
  assert.equal(rating(q), null);
  assert.equal(q.respondent(), null);
});

test('surveys follow the registry: canonical order, omitted blanks, bounds and required answers', () => {
  const { q } = harness();
  const body = plain(
    taste(q, {
      often: 'weekly',
      more: ['sudoku', 'scene', 'castle'],
      difficulty: 'mostly-right',
      tiers: [],
      next: '',
      feel: undefined,
    }),
  );
  assert.deepEqual(body, {
    v: 1,
    survey: 'alibi-taste-1',
    subject: '',
    respondent: '00000000-0000-4000-8000-000000000001',
    release: '0.15.0',
    answers: { often: 'weekly', more: ['scene', 'sudoku', 'castle'], difficulty: 'mostly-right' },
    meta: {},
    comment: '',
    context: { device: 'mobile' },
  });
  const valid = { often: 'daily', difficulty: 'mixed' };
  assert.ok(taste(q, valid));
  assert.equal(taste(q, { often: 'daily' }), null, 'difficulty is required');
  assert.equal(taste(q, { difficulty: 'mixed' }), null, 'often is required');
  assert.equal(taste(q, { ...valid, often: 'hourly' }), null, 'unknown option');
  assert.equal(taste(q, { ...valid, more: ['sudoku', 'chess'] }), null, 'unknown option in many');
  assert.equal(
    taste(q, { ...valid, more: ['sudoku', 'scene', 'trail', 'duel', 'castle', 'gardens'] }),
    null,
    'more takes at most five',
  );
  assert.equal(
    taste(q, { ...valid, tiers: ['gentle', 'steady', 'tricky', 'expert'] }),
    null,
    'tiers takes at most three',
  );
  assert.equal(taste(q, { ...valid, often: ['daily', 'weekly'] }), null, 'one means one');
  assert.deepEqual(plain(taste(q, { ...valid, more: ['duel', 'duel'] }).answers.more), ['duel']);
  const all = {
    often: 'first-time',
    more: ['archive-heist', 'borough', 'block-cabinet', 'gardens', 'casebooks'],
    difficulty: 'too-hard',
    tiers: ['master', 'grandmaster'],
    next: 'polish',
    feel: 'confusing',
    recommend: 'probably-not',
  };
  assert.deepEqual(plain(taste(q, all).answers), all);
  const commented = q.survey({
    survey: 'alibi-taste-1',
    answers: valid,
    comment: '  More bridges\u0000please ',
    release: '0.15.0',
    device: 'tablet',
  });
  assert.equal(commented.comment, 'More bridges please');
  assert.equal(
    q.survey({
      survey: 'alibi-taste-1',
      answers: valid,
      comment: 'x'.repeat(501),
      release: '0.15.0',
      device: 'tablet',
    }),
    null,
  );
  assert.equal(
    q.survey({
      survey: 'alibi-taste-1',
      subject: 'scene-01',
      answers: valid,
      release: '0.15.0',
      device: 'mobile',
    }),
    null,
    'the taste survey takes no subject',
  );
  assert.equal(
    q.survey({ survey: 'alibi-taste-2', answers: valid, release: '0.15.0', device: 'mobile' }),
    null,
  );
});

test('a rating needs a puzzle subject, family and tier; more is yes or absent; no comment', () => {
  const { q } = harness();
  assert.deepEqual(plain(rating(q, 'scene-01', { difficulty: 'too-hard', more: 'yes' })), {
    v: 1,
    survey: 'puzzle-rating',
    subject: 'scene-01',
    respondent: '00000000-0000-4000-8000-000000000001',
    release: '0.15.0',
    answers: { difficulty: 'too-hard', more: 'yes' },
    meta: { family: 'scene', tier: 'gentle' },
    comment: '',
    context: { device: 'desktop' },
  });
  assert.deepEqual(plain(rating(q).answers), { difficulty: 'just-right' });
  assert.equal(rating(q, 'scene-01', { more: 'yes' }), null, 'difficulty is required');
  assert.equal(rating(q, 'scene-01', { difficulty: 'mostly-right' }), null);
  assert.equal(rating(q, ''), null, 'a rating needs its puzzle');
  assert.equal(rating(q, 'Not An Id'), null);
  const base = {
    survey: 'puzzle-rating',
    subject: 'scene-01',
    answers: { difficulty: 'too-easy' },
    release: '0.15.0',
    device: 'mobile',
  };
  assert.equal(q.survey({ ...base, meta: { family: 'chess', tier: 'gentle' } }), null);
  assert.equal(q.survey({ ...base, meta: { family: 'scene', tier: 'Gentle' } }), null);
  assert.equal(q.survey({ ...base, meta: { family: 'scene' } }), null);
  assert.equal(q.survey({ ...base, meta: { family: 'scene', tier: 'gentle', seconds: 3 } }), null);
  assert.equal(
    q.survey({ ...base, meta: { family: 'scene', tier: 'gentle' }, comment: 'hi' }),
    null,
  );
  for (const family of q.FAMILIES)
    for (const tier of q.TIERS) assert.ok(q.survey({ ...base, meta: { family, tier } }));
});

test('the survey key is created on the first submit, reused, and replaced after a reset', () => {
  const { q, store } = harness();
  assert.equal(q.respondent(), null, 'reading never creates a key');
  assert.equal(feedback(q).respondent, undefined, 'feedback carries no identifier');
  assert.equal(q.respondent(), null, 'feedback never creates a key');
  const first = rating(q).respondent;
  assert.equal(JSON.parse(store.map.get('alibi:voices:respondent:v1')), first);
  assert.equal(taste(q).respondent, first, 'surveys and ratings share one key');
  assert.equal(rating(q, 'scene-02').respondent, first);
  q.resetRespondent();
  assert.equal(store.map.has('alibi:voices:respondent:v1'), false);
  const next = taste(q).respondent;
  assert.notEqual(next, first);
  assert.match(next, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  store.map.set('alibi:voices:respondent:v1', '"not-a-key"');
  assert.notEqual(taste(q).respondent, 'not-a-key', 'a malformed key is replaced');
});

test('202 removes: POST feedback, PUT surveys, JSON only, no credentials or referrer', async () => {
  const { q, calls, store } = harness({ replies: [202, { status: 202 }] });
  const fb = feedback(q);
  const rt = rating(q);
  assert.equal(q.enqueue(fb), true);
  assert.equal(q.enqueue(rt), true);
  assert.equal(q.pending().length, 2);
  await q.flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `${COLLECTOR}/v1/feedback/alibi`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[1].url, `${COLLECTOR}/v1/survey/alibi`);
  assert.equal(calls[1].init.method, 'PUT');
  for (const call of calls) {
    assert.deepEqual(plain(call.init.headers), { 'content-type': 'application/json' });
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.referrerPolicy, 'no-referrer');
  }
  assert.deepEqual(calls[0].body, plain(fb), 'the queued payload is sent exactly');
  assert.deepEqual(calls[1].body, plain(rt));
  assert.equal(q.pending().length, 0);
  assert.equal(store.map.has('alibi:voices:queue:v1'), false, 'an empty queue leaves no key');
});

test('a resend keeps its id, and a duplicate 202 is removed like any acceptance', async () => {
  const duplicate = () => ({ status: 202, headers: null, json: () => ({ duplicate: true }) });
  const { q, calls, clock } = harness({ replies: ['network', duplicate] });
  const fb = feedback(q);
  q.enqueue(fb);
  await q.flush();
  assert.equal(q.pending().length, 1);
  assert.equal(q.enqueue(fb), true);
  assert.equal(q.pending().length, 1, 'the same id is queued once');
  clock.t += MIN;
  await q.flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.id, calls[1].body.id, 'the idempotency key survives the retry');
  assert.equal(q.pending().length, 0);
});

test('400 removes the item and keeps a local could-not-be-sent note', async () => {
  const { q, calls } = harness({ replies: [400] });
  q.enqueue(feedback(q));
  await q.flush();
  assert.equal(calls.length, 1);
  assert.equal(q.pending().length, 0);
  assert.deepEqual(plain(q.notes()), [{ what: 'feedback', day: '2026-09-27' }]);
  q.dismissNotes();
  assert.deepEqual(plain(q.notes()), []);
});

test('network errors, 429, 5xx and 503 keep the item with 1m, 5m, 30m, 2h, then 6h backoff', async () => {
  const replies = ['network', 500, 503, { status: 429 }, 502, 'network', 504];
  const { q, calls, clock } = harness({ replies });
  q.enqueue(rating(q));
  const waits = [];
  for (let i = 0; i < 7; i++) {
    await q.flush();
    assert.equal(calls.length, i + 1, `attempt ${i + 1}`);
    const [item] = q.pending();
    assert.equal(item.attempts, i + 1);
    waits.push(item.next - clock.t);
    await q.flush();
    assert.equal(calls.length, i + 1, 'not due yet: nothing is sent');
    clock.t = item.next;
  }
  assert.deepEqual(waits, [MIN, 5 * MIN, 30 * MIN, 2 * HOUR, 6 * HOUR, 6 * HOUR, 6 * HOUR]);
  await q.flush();
  assert.equal(q.pending().length, 0, 'finally accepted');
});

test('429 honours Retry-After when it is longer than the backoff', async () => {
  const { q, clock } = harness({ replies: [{ status: 429, retryAfter: '3600' }] });
  q.enqueue(feedback(q));
  await q.flush();
  assert.equal(q.pending()[0].next - clock.t, HOUR);
});

test('other refusals (403, 404, 415) are kept and retried rather than lost', async () => {
  const { q } = harness({ replies: [403, 404, 415] });
  q.enqueue(feedback(q));
  await q.flush();
  assert.equal(q.pending().length, 1);
  assert.deepEqual(plain(q.notes()), []);
});

test('a failure ends the pass; the next due item waits for the next trigger', async () => {
  const { q, calls, clock } = harness({ replies: ['network'] });
  q.enqueue(feedback(q));
  clock.t += 1;
  q.enqueue(feedback(q, { text: 'second' }));
  await q.flush();
  assert.equal(calls.length, 1);
  await q.flush();
  assert.equal(calls.length, 2, 'the second item is tried next time');
  assert.equal(q.pending().length, 1, 'the first is still backing off');
});

test('offline makes no attempt, and reconnecting sends the queue', async () => {
  const { q, calls, state } = harness({ online: false });
  q.enqueue(feedback(q));
  await q.flush();
  assert.equal(calls.length, 0);
  assert.equal(q.pending()[0].attempts, 0, 'no attempt is counted while offline');
  state.online = true;
  await q.flush();
  assert.equal(calls.length, 1);
  assert.equal(q.pending().length, 0);
});

test('a newer survey or rating for the same survey and subject replaces the queued one', () => {
  const { q } = harness();
  q.enqueue(rating(q, 'scene-01', { difficulty: 'too-easy' }));
  q.enqueue(rating(q, 'scene-02', { difficulty: 'too-easy' }));
  q.enqueue(taste(q));
  q.enqueue(rating(q, 'scene-01', { difficulty: 'too-hard', more: 'yes' }));
  q.enqueue(taste(q, { often: 'daily', difficulty: 'too-hard' }));
  q.enqueue(feedback(q));
  q.enqueue(feedback(q));
  const list = q.pending().map((x) => x.payload);
  assert.equal(list.length, 5);
  assert.deepEqual(plain(list.map((p) => [p.survey || 'feedback', p.subject])), [
    ['puzzle-rating', 'scene-02'],
    ['puzzle-rating', 'scene-01'],
    ['alibi-taste-1', ''],
    ['feedback', 'vault-binary-04'],
    ['feedback', 'vault-binary-04'],
  ]);
  assert.equal(list[1].answers.difficulty, 'too-hard');
  assert.equal(list[2].answers.often, 'daily');
});

test('a rating changed while the older one is in flight still sends the newer answer', async () => {
  let release;
  const { q, calls } = harness({
    replies: [() => new Promise((r) => (release = () => r({ status: 202, headers: null })))],
  });
  q.enqueue(rating(q, 'scene-01', { difficulty: 'too-easy' }));
  const pass = q.flush();
  await new Promise((r) => setImmediate(r));
  q.enqueue(rating(q, 'scene-01', { difficulty: 'too-hard' }));
  const again = q.flush();
  assert.equal(again, pass, 'a flush while busy joins the running pass');
  release();
  await pass;
  assert.deepEqual(
    calls.map((c) => c.body.answers.difficulty),
    ['too-easy', 'too-hard'],
  );
  assert.equal(q.pending().length, 0);
});

test('at most twenty items wait; the twenty-first is refused, not a silent loss', () => {
  const { q, clock } = harness();
  for (let i = 0; i < 20; i++) {
    clock.t += 1;
    assert.equal(q.enqueue(feedback(q, { text: 'message ' + i })), true);
  }
  assert.equal(q.enqueue(feedback(q, { text: 'one too many' })), false);
  assert.equal(q.pending().length, 20);
  assert.equal(q.pending()[0].payload.text, 'message 0', 'nothing waiting was displaced');
  assert.equal(q.enqueue(rating(q)), false, 'ratings respect the bound too');
  q.clear();
  assert.equal(q.pending().length, 0);
});

test('items older than thirty days are dropped unsent', async () => {
  const { q, calls, clock } = harness({ online: false });
  q.enqueue(feedback(q));
  clock.t += 30 * DAY - 1;
  assert.equal(q.pending().length, 1);
  clock.t += 1;
  assert.equal(q.pending().length, 0);
  await q.flush();
  assert.equal(calls.length, 0);
});

test('corrupt or foreign queue data is treated as empty and then replaced', () => {
  for (const raw of ['{', 'null', '42', '"text"', '{"payload":1}', '[1,null,{"payload":{}}]']) {
    const store = storage({ 'alibi:voices:queue:v1': raw });
    const { q } = harness({ store });
    assert.equal(q.pending().length, 0, raw);
    q.enqueue(feedback(q));
    assert.equal(JSON.parse(store.map.get('alibi:voices:queue:v1')).length, 1, raw);
  }
  const store = storage({ 'alibi:voices:unsent:v1': '{"bad":' });
  assert.deepEqual(plain(harness({ store }).q.notes()), []);
});

test('unavailable or full storage keeps a working in-memory queue for the page', async () => {
  for (const options of [{ throws: true }, { full: true }]) {
    const { q, calls } = harness({ store: storage({}, options), replies: ['network', 202] });
    assert.equal(q.enqueue(feedback(q)), true);
    assert.equal(q.pending().length, 1);
    await q.flush();
    assert.equal(q.pending().length, 1);
    assert.equal(q.pending()[0].attempts, 1);
    await q.flush();
    assert.equal(calls.length, 1, 'backoff still applies in memory');
  }
  const { q, calls } = harness({ store: storage({}, { throws: true }) });
  q.enqueue(feedback(q));
  await q.flush();
  assert.equal(calls.length, 1);
  assert.equal(q.pending().length, 0, 'accepted and removed without looping');
});

test('survey invitation timing: first offer, updates, snoozes and stop', () => {
  const { q } = harness();
  const day = (d, h = 10) => Date.UTC(2026, 8, d, h);
  const now = day(27);
  const five = [day(20), day(20, 11), day(20, 12), day(20, 13), day(21)];
  assert.equal(q.due({}, [], '0.15.0', now), 0, 'never on a first visit');
  assert.equal(q.due({}, five.slice(0, 4), '0.15.0', now), 0, 'four completions are not enough');
  assert.equal(
    q.due({}, [day(20), day(20, 11), day(20, 12), day(20, 13), day(20, 14)], '0.15.0', now),
    0,
    'five completions on one day are not enough',
  );
  assert.equal(q.due({}, five, '0.15.0', now), 1, 'five on two days: the first invitation');
  assert.equal(q.due({ snoozes: 1, until: now + 1 }, five, '0.15.0', now), 0, 'a snooze waits');
  assert.equal(q.due({ snoozes: 2, until: now }, five, '0.15.0', now), 1, 'the snooze ends');
  assert.equal(q.due({ snoozes: 3, until: 0 }, five, '0.15.0', now), 0, 'three snoozes stop it');
  assert.equal(q.due({ never: 1 }, five, '0.15.0', now), 0, "Don't ask again stops it");
  const taken = { at: day(1), n: 5, release: '0.15.0' };
  const fifteen = Array.from({ length: 15 }, (_, i) => day(1 + (i % 20)));
  assert.equal(q.due({ taken }, five, '0.15.0', now), 0, 'answered: no update without new play');
  assert.equal(
    q.due({ taken }, fifteen, '0.15.0', now),
    0,
    'ten more completions, but not 30 days',
  );
  assert.equal(q.due({ taken }, fifteen, '0.15.0', day(1) + 30 * DAY), 2, '30 days and ten more');
  assert.equal(q.due({ taken }, five, '0.16.0', day(1) + 30 * DAY), 2, '30 days and a new release');
  assert.equal(
    q.due({ taken }, five, '0.15.0', day(1) + 30 * DAY),
    0,
    '30 days alone is not enough',
  );
  assert.equal(
    q.due({ taken, snoozes: 3 }, fifteen, '0.16.0', day(1) + 40 * DAY),
    0,
    'stopped offers stay stopped after answering',
  );
});

test('several queued surveys and ratings all go in one pass', async () => {
  const { q, calls, state, clock } = harness({ online: false });
  q.enqueue(rating(q, 'scene-01'));
  clock.t += 1;
  q.enqueue(rating(q, 'scene-02'));
  clock.t += 1;
  q.enqueue(taste(q));
  clock.t += 1;
  q.enqueue(feedback(q));
  state.online = true;
  await q.flush();
  assert.deepEqual(
    calls.map((c) => [c.body.survey || 'feedback', c.body.subject]),
    [
      ['puzzle-rating', 'scene-01'],
      ['puzzle-rating', 'scene-02'],
      ['alibi-taste-1', ''],
      ['feedback', 'vault-binary-04'],
    ],
  );
  assert.equal(q.pending().length, 0, 'one reconnect sends everything waiting');
});

test('a request that never answers is abandoned after the timeout and retried later', async () => {
  const { q, calls, clock } = harness({ timers: true, timeout: 20, replies: ['hang', 202] });
  q.enqueue(feedback(q));
  await q.flush();
  assert.equal(calls.length, 1);
  assert.ok(calls[0].init.signal, 'every request carries an abort signal');
  const [item] = q.pending();
  assert.equal(item.attempts, 1, 'a timeout counts as a network error');
  clock.t = item.next;
  await q.flush();
  assert.equal(calls.length, 2, 'the queue is not stuck behind the hung request');
  assert.equal(q.pending().length, 0);
});

test('the collector outcome is reported per payload: 202 sent, 400 refused, else waiting', async () => {
  const { q, state } = harness({ replies: [202, 400], online: true });
  const accepted = feedback(q);
  const refused = feedback(q, { text: 'second' });
  q.enqueue(accepted);
  q.enqueue(refused);
  await q.flush();
  assert.equal(q.outcome(accepted), 202);
  assert.equal(q.outcome(refused), 400, 'a refusal is not reported as delivered');
  state.online = false;
  const waiting = feedback(q, { text: 'third' });
  q.enqueue(waiting);
  await q.flush();
  assert.equal(q.outcome(waiting), undefined);
});

test('with storage unavailable the survey key stays the same for the page', () => {
  for (const options of [{ throws: true }, { full: true }]) {
    const { q } = harness({ store: storage({}, options) });
    const first = rating(q).respondent;
    assert.equal(rating(q, 'scene-02').respondent, first, 'updates still replace, not inflate');
    assert.equal(taste(q).respondent, first);
    q.resetRespondent();
    assert.notEqual(taste(q).respondent, first, 'Reset still makes a new key');
  }
});
