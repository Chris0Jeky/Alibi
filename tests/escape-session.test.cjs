'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '../tools/escape-session.cjs');
const api = fs.existsSync(target) ? require(target) : {};
const { fixture } = require('./fixtures/escape-room.cjs');
test('creates a bounded memory-only room session', () => {
  assert.equal(typeof api.createRoomSession, 'function');
  const room = api.createRoomSession(fixture());
  assert.equal(room.view(true).won, false);
  assert.equal(room.undoDepth(), 0);
});
test('only real changes enter history and completion remains terminal', () => {
  const room = api.createRoomSession(fixture());
  assert.equal(room.attempt('absent', null).code, 'locked');
  assert.equal(room.undoDepth(), 0);
  assert.equal(room.attempt('leave', null).ok, true);
  assert.equal(room.view(false).won, true);
  assert.equal(room.attempt('leave', null).code, 'complete');
  assert.equal(room.undoDepth(), 1);
  assert.equal(room.undo(), true);
  assert.equal(room.view(true).won, false);
  assert.equal(room.undo(), false);
});
test('sessions and returned views are independent; restart clears history', () => {
  const d = fixture(),
    a = api.createRoomSession(d),
    b = api.createRoomSession(d);
  a.view(true).objects[0].title = 'changed';
  assert.equal(a.view(true).objects[0].title, 'Hatch');
  a.attempt('leave', null);
  assert.equal(b.view(true).won, false);
  a.restart();
  assert.equal(a.undoDepth(), 0);
  assert.equal(a.view(true).won, false);
});
test('retains at most 64 undo states during reversible exploration', () => {
  const d = fixture();
  for (const [id, from, to] of [
    ['drop', 'held', 'lost'],
    ['recover', 'lost', 'held'],
  ]) {
    d.actions.push({
      ...structuredClone(d.actions[0]),
      id,
      when: { key: from },
      check: {},
      set: { key: to },
    });
  }
  const room = api.createRoomSession(d);
  for (let i = 0; i < 80; i++) room.attempt(i % 2 ? 'recover' : 'drop', null);
  assert.equal(room.undoDepth(), 64);
  for (let i = 0; i < 64; i++) assert.equal(room.undo(), true);
  assert.equal(room.undo(), false);
});
test('rejects malformed definitions and isolates later edits to source', () => {
  assert.throws(() => api.createRoomSession({}), /room/);
  const d = fixture(),
    room = api.createRoomSession(d);
  d.actions[0].set.door = 'closed';
  assert.equal(room.attempt('leave', null).ok, true);
  assert.equal(room.view(true).won, true);
});
