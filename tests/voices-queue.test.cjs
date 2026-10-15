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
const REVISIONS = 'alibi:voices:revisions:v2';

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
function harness({
  replies = [],
  store = storage(),
  online = true,
  timers = false,
  timeout,
  lock = locks(),
} = {}) {
  const context = timers ? { AbortController, setTimeout, clearTimeout } : {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'voices-queue.js' });
  const calls = [];
  const clock = { t: T0 };
  let n = 0;
  const state = { online, replies };
  const q = context.AlibiVoicesQueue({
    locks: lock,
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
      if (typeof reply === 'function') return reply(calls.at(-1).body);
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
const rating = async (q, subject = 'scene-01', answers = { difficulty: 'just-right' }) =>
  await q.survey({
    survey: 'puzzle-rating',
    subject,
    answers,
    meta: { family: 'scene', tier: 'gentle' },
    release: '0.15.0',
    device: 'desktop',
  });
const taste = async (q, answers) =>
  await q.survey({
    survey: 'alibi-taste-1',
    answers: answers || { often: 'weekly', more: ['scene', 'sudoku'], difficulty: 'mostly-right' },
    release: '0.15.0',
    device: 'mobile',
  });

test('v2 revisions survive offline reload, retry unchanged, and advance only for deliberate edits', async () => {
  const first = harness({ online: false });
  const edit = await rating(first.q);
  assert.equal(edit.v, 2);
  assert.equal(edit.revision, 1);
  await first.q.enqueue(edit);
  await first.q.flush();
  assert.equal(first.calls.length, 0);
  const reloaded = harness({ store: first.store, replies: ['network', 202] });
  assert.deepEqual(plain(reloaded.q.pending()[0].payload), plain(edit));
  await reloaded.q.flush();
  reloaded.clock.t += MIN;
  await reloaded.q.flush();
  assert.deepEqual(
    reloaded.calls.map((x) => x.body),
    [plain(edit), plain(edit)],
  );
  assert.equal(
    (await rating(reloaded.q)).revision,
    2,
    'even a deliberate reconfirmation increments',
  );
  assert.equal((await rating(reloaded.q, 'scene-02')).revision, 1, 'subjects are independent');
  assert.equal((await taste(reloaded.q)).revision, 1, 'survey types are independent');
  assert.equal(
    (await rating(harness({ store: first.store }).q)).revision,
    3,
    'draining does not erase the counter',
  );
});

test('an out-of-order enqueue cannot replace the newest revision', async () => {
  const { q } = harness({ online: false });
  const older = await rating(q, 'scene-01', { difficulty: 'too-easy' });
  const newer = await rating(q, 'scene-01', { difficulty: 'too-hard' });
  await q.enqueue(newer);
  await q.enqueue(older);
  assert.deepEqual(plain(q.pending().map((x) => x.payload)), [plain(newer)]);
  q.clear();
  assert.equal(
    await q.enqueue(older),
    false,
    'a drained newer edit still prevents re-queuing an older one',
  );
  assert.equal(q.pending().length, 0);
});

test('two tabs allocate distinct revisions atomically and keep the newer queued answer', async () => {
  const store = storage(),
    lock = locks();
  const a = harness({ store, lock }).q,
    b = harness({ store, lock }).q;
  const [older, newer] = await Promise.all([await rating(a), await rating(b)]);
  assert.equal(older.respondent, newer.respondent);
  assert.deepEqual([older.revision, newer.revision], [1, 2]);
  await Promise.all([b.enqueue(newer), a.enqueue(older)]);
  assert.deepEqual(plain(a.pending().map((x) => x.payload)), [plain(newer)]);
});

test('202 updated, duplicate and stale finish the request without retry or refusal note', async () => {
  for (const result of [{ updated: true }, { duplicate: true }, { stale: true }]) {
    const { q, calls } = harness({ replies: [() => ({ status: 202, json: async () => result })] });
    const edit = await rating(q);
    await q.enqueue(edit);
    await q.flush();
    await q.flush();
    assert.equal(calls.length, 1);
    assert.equal(q.pending().length, 0);
    assert.equal(q.outcome(edit), 202);
    assert.deepEqual(plain(q.notes()), []);
  }
});

test('409 revision_conflict drops the item with the same local refusal note as 400', async () => {
  const { q, calls } = harness({ replies: [409] });
  const edit = await rating(q);
  await q.enqueue(edit);
  await q.flush();
  await q.flush();
  assert.equal(calls.length, 1);
  assert.equal(q.pending().length, 0);
  assert.equal(q.outcome(edit), 409);
  assert.deepEqual(plain(q.notes()), [{ what: 'puzzle-rating', day: '2026-09-27' }]);
});

test('revision maximum is accepted once; overflow refuses the edit without wrapping or losing the queue', async () => {
  const { q, store } = harness({ online: false });
  const first = await rating(q);
  store.setItem(
    REVISIONS,
    JSON.stringify({ [`${first.respondent}/puzzle-rating/scene-01`]: 2147483646 }),
  );
  const last = await rating(q);
  assert.equal(last.revision, 2147483647);
  await q.enqueue(last);
  assert.equal(await rating(q), null);
  assert.equal(q.pending()[0].payload.revision, 2147483647);
});

test('legacy queued surveys migrate to v2 before sending, ahead of a newer deliberate edit', async () => {
  const { q, store } = harness();
  const legacy = plain(await rating(q));
  legacy.v = 1;
  delete legacy.revision;
  store.removeItem(REVISIONS);
  store.setItem(q.QUEUE, JSON.stringify([{ payload: legacy, attempts: 2, next: 0, queued: T0 }]));
  const migrated = harness({ store });
  await migrated.q.flush();
  assert.equal(migrated.calls[0].body.v, 2);
  assert.equal(migrated.calls[0].body.revision, 1);
  assert.equal((await rating(migrated.q)).revision, 2);
  store.setItem(q.QUEUE, JSON.stringify([{ payload: legacy, attempts: 0, next: 0, queued: T0 }]));
  const next = await rating(migrated.q, 'scene-01', { difficulty: 'too-hard' });
  await migrated.q.enqueue(next);
  assert.equal(next.revision, 3);
  assert.deepEqual(plain(migrated.q.pending().map((x) => x.payload)), [plain(next)]);
});

test('surveys refuse to allocate a revision without durable storage or cross-tab locking', async () => {
  for (const h of [harness({ store: storage({}, { full: true }) }), harness({ lock: null })]) {
    assert.equal(await rating(h.q), null);
    assert.equal(h.q.pending().length, 0);
  }
});

test('a rejected Web Lock refuses surveys without writing a revision and can recover', async () => {
  const lock = locks(),
    request = lock.request;
  lock.request = () => Promise.reject(new DOMException('Blocked', 'SecurityError'));
  const { q, store, calls } = harness({ lock });
  assert.equal(await taste(q), null);
  assert.equal(await rating(q), null);
  assert.equal(store.map.has(REVISIONS), false);
  assert.equal(q.pending().length, 0);
  assert.equal(calls.length, 0);
  lock.request = request;
  assert.equal((await rating(q)).revision, 1);
});

test('a lock rejected after allocation refuses enqueue and leaves queued surveys untouched', async () => {
  const lock = locks();
  const { q, calls } = harness({ lock });
  const first = await rating(q);
  await q.enqueue(first);
  const next = await rating(q);
  lock.request = () => Promise.reject(new DOMException('Blocked', 'SecurityError'));
  assert.equal(await q.enqueue(next), false);
  await q.flush();
  assert.deepEqual(plain(q.pending().map((x) => x.payload)), [plain(first)]);
  assert.equal(calls.length, 0, 'no survey is sent without a lock');
});

test('rejected Web Locks preserve feedback memory-only delivery and retry', async () => {
  const { q, calls, clock } = harness({
    lock: { request: () => Promise.reject(new DOMException('Blocked', 'SecurityError')) },
    store: storage({}, { throws: true }),
    replies: ['network', 202],
  });
  const payload = feedback(q);
  assert.equal(await q.enqueue(payload), true);
  await q.flush();
  assert.equal(q.pending()[0].attempts, 1);
  clock.t = q.pending()[0].next;
  await q.flush();
  assert.equal(calls.length, 2);
  assert.equal(q.outcome(payload), 202);
  assert.equal(q.pending().length, 0);
});

test('a queued v2 item missing its revision does not prevent later edits', async () => {
  const { q, store } = harness({ online: false });
  const old = plain(await rating(q));
  delete old.revision;
  store.removeItem(REVISIONS);
  store.setItem(q.QUEUE, JSON.stringify([{ payload: old, attempts: 0, next: 0, queued: T0 }]));
  const next = await rating(q);
  assert.equal(next.revision, 1);
  assert.equal(await q.enqueue(next), true);
  assert.deepEqual(plain(q.pending().map((x) => x.payload)), [plain(next)]);
});

test('a delayed older delivery is stale after the newer edit arrives, without removing a newer queue item', async () => {
  let release, stored;
  const collect = (body) => {
    if (!stored || body.revision > stored.revision) stored = body;
    return { status: 202, json: async () => ({ stale: body.revision < stored.revision }) };
  };
  const first = harness({
    replies: [
      (body) =>
        new Promise((resolve) => {
          release = () => resolve(collect(body));
        }),
    ],
  });
  const older = await rating(first.q, 'scene-01', { difficulty: 'too-easy' });
  await first.q.enqueue(older);
  const sending = first.q.flush();
  await new Promise((r) => setImmediate(r));
  const second = harness({ store: first.store, replies: [collect] });
  const newer = await rating(second.q, 'scene-01', { difficulty: 'too-hard' });
  await second.q.enqueue(newer);
  await second.q.flush();
  assert.equal(stored.revision, 2);
  release();
  await sending;
  assert.equal(stored.answers.difficulty, 'too-hard');
  assert.equal(first.q.pending().length, 0);
  assert.equal(first.q.outcome(older), 202);
});

test('reset removes revision identity; a new respondent starts at revision 1', async () => {
  const { q, store } = harness();
  const before = await rating(q);
  assert.equal((await rating(q)).revision, 2);
  q.resetRespondent();
  assert.equal(store.getItem(REVISIONS), null);
  const after = await rating(q);
  assert.notEqual(after.respondent, before.respondent);
  assert.equal(after.revision, 1);
});

test('corrupt revision counters cannot emit repeated revision 1 payloads', async () => {
  const { q, store } = harness();
  const first = await rating(q);
  for (const value of [[], 42, 'text', { [`${first.respondent}/puzzle-rating/scene-01`]: 1.5 }]) {
    store.setItem(REVISIONS, JSON.stringify(value));
    assert.equal(await rating(q), null);
  }
});

test('feedback is exactly the pulseboard.feedback/1 payload, cleaned and bounded', async () => {
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

test('without a random source nothing is built', async () => {
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  const q = context.AlibiVoicesQueue({ storage: storage(), uuid: () => 'not-a-uuid' });
  assert.equal(feedback(q), null);
  assert.equal(await rating(q), null);
  assert.equal(q.respondent(), null);
});

test('surveys follow the registry: canonical order, omitted blanks, bounds and required answers', async () => {
  const { q } = harness();
  const body = plain(
    await taste(q, {
      often: 'weekly',
      more: ['sudoku', 'scene', 'castle'],
      difficulty: 'mostly-right',
      tiers: [],
      next: '',
      feel: undefined,
    }),
  );
  assert.deepEqual(body, {
    v: 2,
    revision: 1,
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
  assert.ok(await taste(q, valid));
  assert.equal(await taste(q, { often: 'daily' }), null, 'difficulty is required');
  assert.equal(await taste(q, { difficulty: 'mixed' }), null, 'often is required');
  assert.equal(await taste(q, { ...valid, often: 'hourly' }), null, 'unknown option');
  assert.equal(
    await taste(q, { ...valid, more: ['sudoku', 'chess'] }),
    null,
    'unknown option in many',
  );
  assert.equal(
    await taste(q, { ...valid, more: ['sudoku', 'scene', 'trail', 'duel', 'castle', 'gardens'] }),
    null,
    'more takes at most five',
  );
  assert.equal(
    await taste(q, { ...valid, tiers: ['gentle', 'steady', 'tricky', 'expert'] }),
    null,
    'tiers takes at most three',
  );
  assert.equal(await taste(q, { ...valid, often: ['daily', 'weekly'] }), null, 'one means one');
  assert.deepEqual(plain((await taste(q, { ...valid, more: ['duel', 'duel'] })).answers.more), [
    'duel',
  ]);
  const all = {
    often: 'first-time',
    more: ['archive-heist', 'borough', 'block-cabinet', 'gardens', 'casebooks'],
    difficulty: 'too-hard',
    tiers: ['master', 'grandmaster'],
    next: 'polish',
    feel: 'confusing',
    recommend: 'probably-not',
  };
  assert.deepEqual(plain((await taste(q, all)).answers), all);
  const commented = await q.survey({
    survey: 'alibi-taste-1',
    answers: valid,
    comment: '  More bridges\u0000please ',
    release: '0.15.0',
    device: 'tablet',
  });
  assert.equal(commented.comment, 'More bridges please');
  assert.equal(
    await q.survey({
      survey: 'alibi-taste-1',
      answers: valid,
      comment: 'x'.repeat(501),
      release: '0.15.0',
      device: 'tablet',
    }),
    null,
  );
  assert.equal(
    await q.survey({
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
    await q.survey({
      survey: 'alibi-taste-2',
      answers: valid,
      release: '0.15.0',
      device: 'mobile',
    }),
    null,
  );
});

test('a rating needs a puzzle subject, family and tier; more is yes or absent; no comment', async () => {
  const { q } = harness();
  assert.deepEqual(plain(await rating(q, 'scene-01', { difficulty: 'too-hard', more: 'yes' })), {
    v: 2,
    revision: 1,
    survey: 'puzzle-rating',
    subject: 'scene-01',
    respondent: '00000000-0000-4000-8000-000000000001',
    release: '0.15.0',
    answers: { difficulty: 'too-hard', more: 'yes' },
    meta: { family: 'scene', tier: 'gentle' },
    comment: '',
    context: { device: 'desktop' },
  });
  assert.deepEqual(plain((await rating(q)).answers), { difficulty: 'just-right' });
  assert.equal(await rating(q, 'scene-01', { more: 'yes' }), null, 'difficulty is required');
  assert.equal(await rating(q, 'scene-01', { difficulty: 'mostly-right' }), null);
  assert.equal(await rating(q, ''), null, 'a rating needs its puzzle');
  assert.equal(await rating(q, 'Not An Id'), null);
  const base = {
    survey: 'puzzle-rating',
    subject: 'scene-01',
    answers: { difficulty: 'too-easy' },
    release: '0.15.0',
    device: 'mobile',
  };
  assert.equal(await q.survey({ ...base, meta: { family: 'chess', tier: 'gentle' } }), null);
  assert.equal(await q.survey({ ...base, meta: { family: 'scene', tier: 'Gentle' } }), null);
  assert.equal(await q.survey({ ...base, meta: { family: 'scene' } }), null);
  assert.equal(
    await q.survey({ ...base, meta: { family: 'scene', tier: 'gentle', seconds: 3 } }),
    null,
  );
  assert.equal(
    await q.survey({ ...base, meta: { family: 'scene', tier: 'gentle' }, comment: 'hi' }),
    null,
  );
  for (const family of q.FAMILIES)
    for (const tier of q.TIERS) assert.ok(await q.survey({ ...base, meta: { family, tier } }));
});

test('the survey key is created on the first submit, reused, and replaced after a reset', async () => {
  const { q, store } = harness();
  assert.equal(q.respondent(), null, 'reading never creates a key');
  assert.equal(feedback(q).respondent, undefined, 'feedback carries no identifier');
  assert.equal(q.respondent(), null, 'feedback never creates a key');
  const first = (await rating(q)).respondent;
  assert.equal(JSON.parse(store.map.get('alibi:voices:respondent:v1')), first);
  assert.equal((await taste(q)).respondent, first, 'surveys and ratings share one key');
  assert.equal((await rating(q, 'scene-02')).respondent, first);
  q.resetRespondent();
  assert.equal(store.map.has('alibi:voices:respondent:v1'), false);
  const next = (await taste(q)).respondent;
  assert.notEqual(next, first);
  assert.match(next, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  store.map.set('alibi:voices:respondent:v1', '"not-a-key"');
  assert.notEqual((await taste(q)).respondent, 'not-a-key', 'a malformed key is replaced');
});

test('a reset drops queued answers that still carry the old key, keeping messages', async () => {
  const { q, calls, state } = harness({ online: false });
  await q.enqueue(await rating(q, 'scene-01'));
  await q.enqueue(await taste(q));
  const message = feedback(q);
  await q.enqueue(message);
  const old = q.respondent();
  assert.equal(q.pending().length, 3);
  assert.equal(q.resetRespondent(), 2, 'the reset reports how many answers it removed');
  assert.deepEqual(
    plain(q.pending().map((x) => x.payload)),
    [plain(message)],
    'messages carry no key and stay queued',
  );
  await q.enqueue(await rating(q, 'scene-02'));
  state.online = true;
  await q.flush();
  const sent = calls.map((c) => c.body.respondent).filter(Boolean);
  assert.equal(sent.length, 1);
  assert.notEqual(sent[0], old, 'the old key never leaves the device after a reset');
  assert.equal(q.resetRespondent(), 0);
});

test('a reset whose queue rewrite fails still leaves no old-key answer to reload', async () => {
  const { q, store } = harness({ online: false });
  await q.enqueue(await rating(q, 'scene-01'));
  const message = feedback(q);
  await q.enqueue(message);
  store.setItem = () => {
    throw Error('QuotaExceededError');
  };
  assert.equal(q.resetRespondent(), 1);
  assert.deepEqual(plain(q.pending().map((x) => x.payload)), [plain(message)], 'kept this page');
  const stored = store.map.get('alibi:voices:queue:v1');
  assert.ok(
    !stored || !JSON.parse(stored).some((x) => x.payload.respondent),
    'the persisted queue cannot bring the old key back after a reload',
  );
});

test('a reset reports failed key removal and preserves the stored respondent', async () => {
  const { q, store } = harness({ online: false });
  await q.enqueue(await rating(q, 'scene-01'));
  const old = q.respondent(),
    remove = store.removeItem.bind(store);
  store.removeItem = (key) => {
    if (key === q.KEY) throw Error('SecurityError');
    remove(key);
  };
  assert.equal(q.resetRespondent(), false);
  assert.equal(store.getItem(q.KEY), JSON.stringify(old));
  assert.equal(q.respondent(), old);
});

test('a memory-only respondent key is persisted when storage recovers', async () => {
  const map = new Map();
  let full = true;
  const store = {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem(key, value) {
      if (full) throw Error('QuotaExceededError');
      map.set(key, String(value));
    },
    removeItem: (key) => map.delete(key),
  };
  const { q } = harness({ store });
  const first = q.respondent(true);
  assert.equal(map.has(q.KEY), false, 'the first write is retained only in memory');

  full = false;
  assert.equal(q.respondent(), first, 'the page keeps the same respondent');
  assert.equal(JSON.parse(map.get(q.KEY)), first, 'the remembered key is persisted on recovery');
  assert.equal(
    (await rating(harness({ store }).q)).respondent,
    first,
    'the next page reuses the key',
  );
});

test('202 removes: POST feedback, PUT surveys, JSON only, no credentials or referrer', async () => {
  const { q, calls, store } = harness({ replies: [202, { status: 202 }] });
  const fb = feedback(q);
  const rt = await rating(q);
  assert.equal(await q.enqueue(fb), true);
  assert.equal(await q.enqueue(rt), true);
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
  await q.enqueue(fb);
  await q.flush();
  assert.equal(q.pending().length, 1);
  assert.equal(await q.enqueue(fb), true);
  assert.equal(q.pending().length, 1, 'the same id is queued once');
  clock.t += MIN;
  await q.flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.id, calls[1].body.id, 'the idempotency key survives the retry');
  assert.equal(q.pending().length, 0);
});

test('400 removes the item and keeps a local could-not-be-sent note', async () => {
  const { q, calls } = harness({ replies: [400] });
  await q.enqueue(feedback(q));
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
  await q.enqueue(await rating(q));
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
  await q.enqueue(feedback(q));
  await q.flush();
  assert.equal(q.pending()[0].next - clock.t, HOUR);
});

test('other refusals (403, 404, 415) are kept and retried rather than lost', async () => {
  const { q } = harness({ replies: [403, 404, 415] });
  await q.enqueue(feedback(q));
  await q.flush();
  assert.equal(q.pending().length, 1);
  assert.deepEqual(plain(q.notes()), []);
});

test('a failure ends the pass; the next due item waits for the next trigger', async () => {
  const { q, calls, clock } = harness({ replies: ['network'] });
  await q.enqueue(feedback(q));
  clock.t += 1;
  await q.enqueue(feedback(q, { text: 'second' }));
  await q.flush();
  assert.equal(calls.length, 1);
  await q.flush();
  assert.equal(calls.length, 2, 'the second item is tried next time');
  assert.equal(q.pending().length, 1, 'the first is still backing off');
});

test('offline makes no attempt, and reconnecting sends the queue', async () => {
  const { q, calls, state } = harness({ online: false });
  await q.enqueue(feedback(q));
  await q.flush();
  assert.equal(calls.length, 0);
  assert.equal(q.pending()[0].attempts, 0, 'no attempt is counted while offline');
  state.online = true;
  await q.flush();
  assert.equal(calls.length, 1);
  assert.equal(q.pending().length, 0);
});

test('a newer survey or rating for the same survey and subject replaces the queued one', async () => {
  const { q } = harness();
  await q.enqueue(await rating(q, 'scene-01', { difficulty: 'too-easy' }));
  await q.enqueue(await rating(q, 'scene-02', { difficulty: 'too-easy' }));
  await q.enqueue(await taste(q));
  await q.enqueue(await rating(q, 'scene-01', { difficulty: 'too-hard', more: 'yes' }));
  await q.enqueue(await taste(q, { often: 'daily', difficulty: 'too-hard' }));
  await q.enqueue(feedback(q));
  await q.enqueue(feedback(q));
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
  await q.enqueue(await rating(q, 'scene-01', { difficulty: 'too-easy' }));
  const pass = q.flush();
  await new Promise((r) => setImmediate(r));
  await q.enqueue(await rating(q, 'scene-01', { difficulty: 'too-hard' }));
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

test('at most twenty items wait; the twenty-first is refused, not a silent loss', async () => {
  const { q, clock } = harness();
  for (let i = 0; i < 20; i++) {
    clock.t += 1;
    assert.equal(await q.enqueue(feedback(q, { text: 'message ' + i })), true);
  }
  assert.equal(await q.enqueue(feedback(q, { text: 'one too many' })), false);
  assert.equal(q.pending().length, 20);
  assert.equal(q.pending()[0].payload.text, 'message 0', 'nothing waiting was displaced');
  assert.equal(await q.enqueue(await rating(q)), false, 'ratings respect the bound too');
  q.clear();
  assert.equal(q.pending().length, 0);
});

test('items older than thirty days are dropped unsent', async () => {
  const { q, calls, clock } = harness({ online: false });
  await q.enqueue(feedback(q));
  clock.t += 30 * DAY - 1;
  assert.equal(q.pending().length, 1);
  clock.t += 1;
  assert.equal(q.pending().length, 0);
  await q.flush();
  assert.equal(calls.length, 0);
});

test('corrupt or foreign queue data is treated as empty and then replaced', async () => {
  for (const raw of ['{', 'null', '42', '"text"', '{"payload":1}', '[1,null,{"payload":{}}]']) {
    const store = storage({ 'alibi:voices:queue:v1': raw });
    const { q } = harness({ store });
    assert.equal(q.pending().length, 0, raw);
    await q.enqueue(feedback(q));
    assert.equal(JSON.parse(store.map.get('alibi:voices:queue:v1')).length, 1, raw);
  }
  const store = storage({ 'alibi:voices:unsent:v1': '{"bad":' });
  assert.deepEqual(plain(harness({ store }).q.notes()), []);
});

test('unavailable or full storage keeps a working in-memory queue for the page', async () => {
  for (const options of [{ throws: true }, { full: true }]) {
    const { q, calls } = harness({ store: storage({}, options), replies: ['network', 202] });
    assert.equal(await q.enqueue(feedback(q)), true);
    assert.equal(q.pending().length, 1);
    await q.flush();
    assert.equal(q.pending().length, 1);
    assert.equal(q.pending()[0].attempts, 1);
    await q.flush();
    assert.equal(calls.length, 1, 'backoff still applies in memory');
  }
  const { q, calls } = harness({ store: storage({}, { throws: true }) });
  await q.enqueue(feedback(q));
  await q.flush();
  assert.equal(calls.length, 1);
  assert.equal(q.pending().length, 0, 'accepted and removed without looping');
});

test('survey invitation timing: first offer, updates, snoozes and stop', async () => {
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
  assert.equal(
    q.due({ taken }, fifteen, '0.15.0', day(1) + 30 * DAY - 1),
    0,
    'wait the full 30 days',
  );
  assert.equal(
    q.due({ taken }, fifteen.slice(0, 14), '0.15.0', day(1) + 30 * DAY),
    0,
    'nine more is not enough',
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
  await q.enqueue(await rating(q, 'scene-01'));
  clock.t += 1;
  await q.enqueue(await rating(q, 'scene-02'));
  clock.t += 1;
  await q.enqueue(await taste(q));
  clock.t += 1;
  await q.enqueue(feedback(q));
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
  await q.enqueue(feedback(q));
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
  await q.enqueue(accepted);
  await q.enqueue(refused);
  await q.flush();
  assert.equal(q.outcome(accepted), 202);
  assert.equal(q.outcome(refused), 400, 'a refusal is not reported as delivered');
  state.online = false;
  const waiting = feedback(q, { text: 'third' });
  await q.enqueue(waiting);
  await q.flush();
  assert.equal(q.outcome(waiting), undefined);
});

test('re-queuing an identical rating clears its earlier sent outcome', async () => {
  const { q, state } = harness({ replies: [202, 202] });
  const first = await rating(q, 'scene-01', { difficulty: 'too-easy' });
  await q.enqueue(first);
  await q.flush();
  assert.equal(q.outcome(first), 202);

  const changed = await rating(q, 'scene-01', { difficulty: 'just-right' });
  await q.enqueue(changed);
  await q.flush();
  state.online = false;

  const identical = await rating(q, 'scene-01', { difficulty: 'too-easy' });
  assert.equal(identical.revision, 3);
  assert.deepEqual(
    { ...plain(identical), revision: 1 },
    plain(first),
    'only the revision changes on a reconfirmation',
  );
  await q.enqueue(identical);
  assert.equal(q.outcome(identical), undefined, 'queued is not reported as already sent');
  assert.equal(q.pending().length, 1);
});

test('with storage unavailable the survey key stays the same for the page', async () => {
  for (const options of [{ throws: true }, { full: true }]) {
    const { q } = harness({ store: storage({}, options) });
    const first = q.respondent(true);
    assert.equal(await rating(q), null, 'answers require a durable revision');
    assert.equal(q.respondent(), first, 'the page still remembers its key');
    q.resetRespondent();
    assert.notEqual(q.respondent(true), first, 'Reset still makes a new key');
  }
});
