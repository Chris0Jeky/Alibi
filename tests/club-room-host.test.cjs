'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { session, fresh } = require('./helpers/club-session.cjs');
const A = 'https://rooms.example/api',
  B = 'https://collector.example/api';

// Transaction contract fixture; real-origin storage is proved separately.
function indexedDB(data) {
  const entries = new Map([['state', { rev: 1, data }]]);
  const db = {
    close() {},
    transaction() {
      const listeners = {};
      let aborted = false;
      const finish = (event) => {
        for (const f of listeners[event] || []) f();
        tx['on' + event]?.();
      };
      const tx = {
        addEventListener(event, f) {
          (listeners[event] ||= []).push(f);
        },
        abort() {
          aborted = true;
          queueMicrotask(() => finish('abort'));
        },
        objectStore() {
          return {
            get(key) {
              const r = { result: structuredClone(entries.get(key)) };
              queueMicrotask(() => {
                r.onsuccess();
                queueMicrotask(() => {
                  if (!aborted) finish('complete');
                });
              });
              return r;
            },
            put(value, key) {
              entries.set(key, structuredClone(value));
            },
          };
        },
      };
      return tx;
    },
  };
  return {
    open() {
      const r = { result: db };
      queueMicrotask(() => r.onsuccess());
      return r;
    },
  };
}

async function room(t, api = A) {
  const data = fresh();
  data.settings.api = api;
  const calls = [],
    stored = new Map();
  let fail = false,
    responseFields = {};
  const tab = await session(data, null, {
    context: {
      indexedDB: indexedDB(data),
      crypto: webcrypto,
      btoa,
      AbortSignal,
      sessionStorage: {
        getItem: (k) => stored.get(k),
        setItem: (k, v) => stored.set(k, v),
        removeItem: (k) => stored.delete(k),
      },
      fetch: async (url, options) => {
        calls.push({ url, ...options });
        if (fail) throw Error('Synthetic lost response');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            code: 'ABCDEFGH',
            seat: 1,
            joined: true,
            version: 1,
            state: tab.context.AlibiClubEngines.reversi.initial(),
            ...responseFields,
          }),
        };
      },
    },
  });
  t.after(() => tab.action('room-leave'));
  tab.nodes.set('club-api', { value: api });
  tab.nodes.set('club-room-code', { value: 'ABCDEFGH' });
  return {
    ...tab,
    calls,
    stored,
    fail: (value) => {
      fail = value;
    },
    fields: (value) => {
      responseFields = value;
    },
  };
}

test('same API polling and moves retain the original credential despite response fields', async (t) => {
  const tab = await room(t);
  await tab.action('room-create');
  const credential = JSON.parse(tab.stored.get('alibi-club-room'));
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  tab.fields({ api: B, token: 'synthetic-replacement' });
  await tab.action('room-refresh');
  await tab.action('duel-cell', { cell: '19' });
  const authenticated = tab.calls.filter((c) => c.headers.Authorization);
  assert.equal(authenticated.length, 2);
  assert.ok(
    authenticated.every(
      (c) => c.url.startsWith(A + '/') && c.headers.Authorization === 'Bearer ' + credential.token,
    ),
  );
});

for (const api of [B, 'https://rooms.example/another-api']) {
  test(`restoring a different full API address refuses old-room polls and moves: ${api}`, async (t) => {
    const tab = await room(t);
    await tab.action('room-join');
    const credential = JSON.parse(tab.stored.get('alibi-club-room'));
    await tab.club.onRoute({ page: 'salon', id: 'duel' });
    const replacement = tab.state();
    replacement.settings.api = api;
    tab.context.__alibiPendingClub = replacement;
    await tab.action('restore-confirm');
    assert.equal(tab.state().settings.api, api, 'actual restore replaces API settings');
    tab.calls.length = 0;
    await tab.action('room-refresh');
    await tab.action('duel-cell', { cell: '19' });
    assert.equal(tab.calls.length, 0, 'no fetch may carry the old seat credential to new settings');
    assert.equal(JSON.parse(tab.stored.get('alibi-club-room')).token, credential.token);
    assert.ok(tab.messages.some((m) => /API.*changed/i.test(m)));
  });
}

test('lost replies retry and resume the same pending seat only at its original API', async (t) => {
  const tab = await room(t);
  tab.fail(true);
  await tab.action('room-join');
  const first = JSON.parse(tab.calls[0].body);
  assert.equal(tab.calls.length, 2);
  assert.deepEqual(JSON.parse(tab.calls[1].body), first);
  tab.fail(false);
  await tab.action('room-join');
  assert.deepEqual(JSON.parse(tab.calls[2].body), first);
  const credential = JSON.parse(tab.stored.get('alibi-club-room'));
  assert.equal(credential.token, first.seatToken);
  assert.equal(credential.api, A);
});

test('a failed API switch cannot reuse an established or pending seat credential at the new host', async (t) => {
  const tab = await room(t);
  await tab.action('room-create');
  const credential = JSON.parse(tab.stored.get('alibi-club-room'));
  tab.fail(true);
  await tab.action('room-create');
  const pending = JSON.parse(tab.calls.at(-1).body).seatToken;
  tab.nodes.set('club-api', { value: B });
  await tab.action('room-create');
  const switched = tab.calls.filter((c) => c.url.startsWith(B));
  assert.ok(switched.length > 0);
  assert.ok(switched.every((c) => JSON.parse(c.body).seatToken !== pending));
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  tab.calls.length = 0;
  await tab.action('room-refresh');
  await tab.action('duel-cell', { cell: '19' });
  assert.equal(tab.calls.length, 0);
  assert.equal(JSON.parse(tab.stored.get('alibi-club-room')).token, credential.token);
});
