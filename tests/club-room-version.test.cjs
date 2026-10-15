'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
require('../src/core.js');
const E = require('../src/club-engines.js');
const source = fs.readFileSync(path.join(__dirname, '../src/club.js'), 'utf8');

function roomSession() {
  const calls = [],
    status = { textContent: '' };
  const context = {
    room: {
      code: 'ABCDEFGH',
      token: 'synthetic-seat',
      api: 'https://room.test/api',
      seat: 1,
      joined: true,
      version: 5,
      state: E.reversi.initial(),
    },
    roomBusy: false,
    roomError: '',
    route: { page: 'salon', id: 'duel' },
    document: { hidden: false, querySelector: () => status },
    apiBase: () => 'https://room.test/api',
    AbortSignal,
    crypto: webcrypto,
    render() {},
    notify() {},
    startPoll() {},
    fetch: (url, options) =>
      new Promise((resolve, reject) =>
        calls.push({
          url,
          options,
          reply: (value) => resolve({ ok: true, status: 200, json: async () => value }),
          reject,
        }),
      ),
  };
  vm.createContext(context);
  const requestStart = source.indexOf('  async function request(');
  const requestEnd = source.indexOf('  function privateRoomToken(', requestStart);
  const pollStart = source.indexOf('  async function pollRoom(');
  const pollEnd = source.indexOf('  function stopPoll(', pollStart);
  assert.ok(
    requestStart >= 0 && requestEnd > requestStart && pollStart >= 0 && pollEnd > pollStart,
  );
  vm.runInContext(
    source.slice(requestStart, requestEnd) + source.slice(pollStart, pollEnd),
    context,
  );
  return { context, calls, status };
}

function nextState(state) {
  return E.reversi.move(state, E.reversi.legal(state)[0]);
}

test('a delayed v5 poll cannot rewind a successful v6 move', async () => {
  const { context: c, calls } = roomSession();
  const old = structuredClone(c.room),
    poll = c.pollRoom();
  const state = nextState(c.room.state),
    move = c.roomMove(E.reversi.legal(c.room.state)[0]);
  calls[1].reply({ version: 6, state, joined: true });
  await move;
  calls[0].reply(old);
  await poll;
  assert.equal(c.room.version, 6);
  assert.deepEqual(c.room.state, state);
  c.room.seat = state.turn;
  const next = c.roomMove(E.reversi.legal(state)[0]);
  assert.equal(JSON.parse(calls[2].options.body).expectedVersion, 6);
  calls[2].reply({ version: 7, state: nextState(state), joined: true });
  await next;
});

test('a delayed v6 move cannot rewind a newer v7 poll', async () => {
  const { context: c, calls } = roomSession();
  const state6 = nextState(c.room.state),
    state7 = nextState(state6);
  const move = c.roomMove(E.reversi.legal(c.room.state)[0]),
    poll = c.pollRoom();
  calls[1].reply({ version: 7, state: state7, joined: true });
  await poll;
  calls[0].reply({ version: 6, state: state6, joined: true });
  await move;
  assert.equal(c.room.version, 7);
  assert.deepEqual(c.room.state, state7);
});

test('equal versions keep the accepted board and joined state', async () => {
  for (const operation of ['poll', 'move']) {
    const { context: c, calls } = roomSession();
    const state = c.room.state,
      poll = operation === 'poll' ? c.pollRoom() : c.roomMove(E.reversi.legal(state)[0]);
    calls[0].reply({ version: 5, state: nextState(state), joined: false });
    await poll;
    assert.strictEqual(c.room.state, state);
    assert.equal(c.room.joined, true);
  }
});

test('invalid response versions cannot replace the accepted snapshot', async () => {
  for (const operation of ['poll', 'move']) {
    for (const version of [undefined, '6', NaN, -1, 5.5]) {
      const { context: c, calls } = roomSession();
      const room = structuredClone(c.room),
        poll = operation === 'poll' ? c.pollRoom() : c.roomMove(E.reversi.legal(room.state)[0]);
      calls[0].reply({ version, state: nextState(room.state), joined: true });
      await poll;
      assert.deepEqual(c.room, room);
    }
  }
});

test('a response for a replaced room still cannot update its successor', async () => {
  const { context: c, calls } = roomSession();
  const poll = c.pollRoom(),
    replacement = { ...c.room, code: 'BCDEFGHJ' };
  c.room = replacement;
  calls[0].reply({ version: 7, state: nextState(c.room.state), joined: true });
  await poll;
  assert.strictEqual(c.room, replacement);
  assert.equal(c.room.version, 5);
});

test('poll errors remain visible and a matching successful poll clears them', async () => {
  const { context: c, calls, status } = roomSession();
  const poll = c.pollRoom();
  calls[0].reject(Error('Synthetic network failure'));
  await poll;
  assert.match(status.textContent, /Synthetic network failure/);
  const again = c.pollRoom();
  calls[1].reply(structuredClone(c.room));
  await again;
  assert.equal(c.roomError, '');
  assert.equal(c.room.version, 5);
});
