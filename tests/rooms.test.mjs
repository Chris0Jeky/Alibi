import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, { Room, Quota } from '../optional-online/worker.mjs';
const Rules = globalThis.AlibiClubEngines.reversi;
let checks = 0;
const ok = (v, m) => {
    assert.ok(v, m);
    checks++;
  },
  eq = (a, b, m) => {
    assert.deepEqual(a, b, m);
    checks++;
  };
class Storage {
  constructor() {
    this.data = new Map();
    this.alarm = null;
    this.queue = Promise.resolve();
  }
  async get(k) {
    return structuredClone(this.data.get(k));
  }
  async put(k, v) {
    this.data.set(k, structuredClone(v));
  }
  async setAlarm(n) {
    this.alarm = n;
  }
  async deleteAll() {
    this.data.clear();
  }
  transaction(fn) {
    const run = this.queue.then(async () => {
      const before = structuredClone(this.data),
        alarm = this.alarm;
      try {
        return await fn(this);
      } catch (e) {
        this.data = before;
        this.alarm = alarm;
        throw e;
      }
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
function namespace(Class) {
  const map = new Map();
  return {
    map,
    idFromName: (n) => n,
    get(id) {
      if (!map.has(id)) {
        const ctx = { storage: new Storage() };
        map.set(id, { ctx, object: new Class(ctx, {}) });
      }
      return map.get(id).object;
    },
  };
}
const env = {
  ROOMS: namespace(Room),
  QUOTAS: namespace(Quota),
  RATE_SALT: 'test-only-salt-not-for-deployment-123456',
  ALLOWED_ORIGINS: 'https://play.example',
  DEV_LOCAL: 'true',
};
async function api(
  path,
  method = 'GET',
  data,
  token,
  origin = 'https://play.example',
  ip = '127.0.0.1',
) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, Origin: origin };
  if (token) headers.Authorization = 'Bearer ' + token;
  const req = new Request('https://rooms.example/api' + path, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const res = await worker.fetch(req, env);
  let value = null;
  try {
    value = await res.json();
  } catch {}
  return { status: res.status, value, headers: res.headers };
}
function roomIntent(label) {
  return {
    requestId: ('room-request-' + label).padEnd(24, 'x'),
    seatToken: (label + '-seat-token-').padEnd(43, 'x'),
  };
}
const creator = roomIntent('creator');
const a = await api('/rooms', 'POST', creator);
eq(a.status, 200, 'Room creates');
ok(/^[A-Z2-9]{8}$/.test(a.value.code), 'Unpredictable compact code');
ok(!('token' in a.value), 'The service never returns a seat credential');
eq(a.value.seat, 1, 'Creator takes gold');
const code = a.value.code,
  t1 = creator.seatToken;
const createRetry = await api('/rooms', 'POST', creator);
eq(createRetry.status, 200, 'Lost create response retries successfully');
eq(createRetry.value.code, code, 'Create retry recovers the original room');
eq(createRetry.value.version, 0, 'Create retry cannot open another seat');
const creatorQuota = await [...env.QUOTAS.map.values()][0].ctx.storage.get('create');
eq(creatorQuota.count, 1, 'Create retry does not consume another quota slot');
eq(creatorQuota.ids.length, 1, 'Quota retry ledger stays bounded');
eq(
  (await api('/rooms', 'POST', { ...creator, seatToken: roomIntent('intruder').seatToken })).status,
  409,
  'A malicious retry cannot replace the creator credential',
);
const quotaNamespaces = env.QUOTAS.map.size;
eq(
  (
    await api(
      '/rooms',
      'POST',
      { requestId: 'short', seatToken: roomIntent('bad-create').seatToken },
      undefined,
      'https://play.example',
      '198.51.100.44',
    )
  ).status,
  400,
  'Malformed create request is rejected before quota use',
);
eq(env.QUOTAS.map.size, quotaNamespaces, 'Malformed create does not create a quota record');
eq((await api('/rooms/' + code + '/state')).status, 401, 'No anonymous room reads');
eq(
  (
    await api(
      '/rooms/' + code + '/move',
      'POST',
      { cell: 8, expectedVersion: 0, moveId: 'abcdefghijklmnop' },
      t1,
    )
  ).status,
  409,
  'Cannot play before second seat joins',
);
const joiner = roomIntent('joiner');
const b = await api('/rooms/' + code + '/join', 'POST', joiner);
eq(b.status, 200, 'Second seat joins');
eq(b.value.seat, -1, 'Joiner takes ink');
const t2 = joiner.seatToken;
eq(b.value.version, 1, 'Join advances version');
const joinRetry = await api('/rooms/' + code + '/join', 'POST', joiner);
eq(joinRetry.status, 200, 'Lost join response retries successfully');
eq(joinRetry.value.version, 1, 'Join retry cannot claim another seat');
eq(
  (
    await api('/rooms/' + code + '/join', 'POST', {
      ...joiner,
      seatToken: roomIntent('intruder-join').seatToken,
    })
  ).status,
  409,
  'A malicious join retry cannot replace the second credential',
);
eq(
  (
    await api(
      '/rooms/' + code + '/join',
      'POST',
      { requestId: 'short', seatToken: roomIntent('bad-join').seatToken },
      undefined,
      'https://play.example',
      '198.51.100.45',
    )
  ).status,
  400,
  'Malformed join request is rejected before quota use',
);
eq(env.QUOTAS.map.size, quotaNamespaces, 'Malformed join does not create a quota record');
eq(
  (await api('/rooms/' + code + '/join', 'POST', roomIntent('third-seat'))).status,
  409,
  'Room cannot accept a third seat',
);
const read = await api('/rooms/' + code + '/state', 'GET', undefined, t1);
eq(read.status, 200, 'Seat can read current state');
ok(
  !JSON.stringify(read.value).includes(t1) &&
    !('goldHash' in read.value) &&
    !('token' in read.value),
  'Reads never return credentials',
);
eq(read.headers.get('Cache-Control'), 'no-store', 'Room responses are not cacheable');
eq(
  read.headers.get('Access-Control-Allow-Origin'),
  'https://play.example',
  'Explicit origin allowed',
);
eq(
  (await api('/rooms/' + code + '/state', 'GET', undefined, t1, 'https://evil.example')).status,
  403,
  'Unlisted browser origin blocked',
);
eq(
  (await api('/rooms/' + code + '/state', 'GET', undefined, 'A'.repeat(43))).status,
  401,
  'Forged token rejected',
);
const validCell = Rules.legal(read.value.state)[0],
  move = { cell: validCell, expectedVersion: read.value.version, moveId: 'same-request-00001' };
eq(
  (await api('/rooms/' + code + '/move', 'POST', move, t2)).status,
  403,
  'Opponent cannot take the turn',
);
eq(
  (await api('/rooms/' + code + '/move', 'POST', { ...move, cell: 14 }, t1)).status,
  422,
  'Occupied square rejected',
);
eq(
  (await api('/rooms/' + code + '/move', 'POST', { ...move, score: 999 }, t1)).status,
  400,
  'Client scores or extra fields rejected',
);
const first = await api('/rooms/' + code + '/move', 'POST', move, t1);
eq(first.status, 200, 'Legal move accepted');
eq(first.value.version, 2, 'Accepted move advances version');
eq(first.value.state.ply, 1, 'Exactly one move recorded');
const duplicate = await api('/rooms/' + code + '/move', 'POST', move, t1);
eq(duplicate.status, 200, 'Identical retry succeeds idempotently');
eq(duplicate.value.state.ply, 1, 'Retry cannot play twice');
eq(
  (await api('/rooms/' + code + '/move', 'POST', { ...move, cell: move.cell + 1 }, t1)).status,
  409,
  'Reused id with another payload rejected',
);
const q = env.ROOMS.map.get(code);
q.object = new Room(q.ctx, {});
eq(
  (await api('/rooms/' + code + '/state', 'GET', undefined, t1)).value.state,
  first.value.state,
  'Cold instance reloads persisted board',
);
const turn2 = Rules.legal(first.value.state);
const concurrent = await Promise.all(
  turn2
    .slice(0, 2)
    .map((cell, i) =>
      api(
        '/rooms/' + code + '/move',
        'POST',
        { cell, expectedVersion: 2, moveId: 'concurrent-00000' + i },
        t2,
      ),
    ),
);
eq(
  concurrent.map((r) => r.status).sort(),
  [200, 409],
  'Concurrent same-version submissions accept exactly one',
);
let current = (await api('/rooms/' + code + '/state', 'GET', undefined, t1)).value;
let moveNo = 2;
while (!current.state.done) {
  const cell = Rules.legal(current.state)[0],
    token = current.state.turn === 1 ? t1 : t2,
    res = await api(
      '/rooms/' + code + '/move',
      'POST',
      {
        cell,
        expectedVersion: current.version,
        moveId: 'complete-match-' + String(moveNo++).padStart(4, '0'),
      },
      token,
    );
  eq(res.status, 200, 'Server accepts next legal turn');
  current = res.value;
}
ok(current.state.done, 'Two authenticated clients finish a whole match');
ok(current.state.ply <= 32, 'Terminal game bounded');
eq(
  (
    await api(
      '/rooms/' + code + '/move',
      'POST',
      { cell: 0, expectedVersion: current.version, moveId: 'post-finish-000001' },
      t1,
    )
  ).status,
  409,
  'Post-result move rejected',
);
const stored = await q.ctx.storage.get('room');
ok(
  !JSON.stringify(stored).includes(t1) &&
    !JSON.stringify(stored).includes(t2) &&
    !JSON.stringify(stored).includes(creator.requestId) &&
    !JSON.stringify(stored).includes(joiner.requestId),
  'Durable storage contains bounded credential and request digests only',
);
stored.expiresAt = Date.now() - 1;
await q.ctx.storage.put('room', stored);
eq(
  (await api('/rooms', 'POST', creator)).status,
  410,
  'An expired create retry cannot resurrect a room',
);
eq(
  (await api('/rooms/' + code + '/state', 'GET', undefined, t1)).status,
  410,
  'Expired room refuses access',
);
await q.object.alarm();
ok(!(await q.ctx.storage.get('room')), 'Expiry alarm deletes room data');
for (let k = 0; k < 8; k++)
  eq(
    (
      await api(
        '/rooms',
        'POST',
        roomIntent('quota-' + k),
        undefined,
        'https://play.example',
        '198.51.100.5',
      )
    ).status,
    200,
    'Quota allows test creation ' + k,
  );
eq(
  (
    await api(
      '/rooms',
      'POST',
      roomIntent('quota-overflow'),
      undefined,
      'https://play.example',
      '198.51.100.5',
    )
  ).status,
  429,
  'Persisted creation quota blocks ninth request',
);
eq(
  (
    await api(
      '/rooms',
      'POST',
      { padding: 'x'.repeat(5000) },
      undefined,
      'https://play.example',
      '198.51.100.6',
    )
  ).status,
  413,
  'Oversize request refused',
);
const unconfigured = await worker.fetch(new Request('https://rooms.example/api/health'), {});
eq(unconfigured.status, 503, 'Missing bindings or secret fail closed');
const pre = await api('/rooms', 'OPTIONS');
eq(pre.status, 204, 'Explicit preflight succeeds');
fs.writeFileSync(
  new URL('./rooms-results.json', import.meta.url),
  JSON.stringify(
    {
      passed: true,
      assertions: checks,
      scope:
        'Actual Worker/Room request handlers with a serial transactional storage fixture. Not deployed to Cloudflare.',
      finishedGamePlies: current.state.ply,
    },
    null,
    2,
  ),
);
console.log('PASS', checks, 'private-room protocol assertions.');
