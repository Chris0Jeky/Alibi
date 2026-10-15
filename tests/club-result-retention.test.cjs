'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { session, fresh } = require('./helpers/club-session.cjs');
const E = require('../src/club-engines.js');
const gardens = require('../content/region-gardens.json').puzzles;

const win = [0, 3, 1, 4, 2];
function finishedDuel() {
  let state = E.reversi.initial();
  const log = [];
  while (!state.done) {
    const cell = E.reversi.legal(state)[0];
    log.push(cell);
    state = E.reversi.move(state, cell);
  }
  return log;
}
function fixture(id, records = []) {
  const data = fresh();
  data.records = records;
  data.runs[id] =
    id === 'duel'
      ? { mode: 'bot', difficulty: 'expert', log: finishedDuel(), redo: [] }
      : id === 'regiongardens'
        ? { level: 0, log: gardens[0].solution, redo: [] }
        : { mode: 'local', log: win, redo: [] };
  return data;
}
async function open(data, id) {
  const tab = await session(data);
  await tab.club.onRoute({ page: 'salon', id });
  return tab;
}

for (const id of ['tictactoe', 'duel', 'regiongardens']) {
  test(`${id}: replay retains a restored result with no journal entry, including reload`, async () => {
    const tab = await open(fixture(id), id);
    assert.equal(tab.state().records.length, 0, 'the valid restored result has no entry');
    await tab.action('restart', { id });
    assert.equal(tab.dialogs.length, 0, 'finished replay stays immediate');
    assert.deepEqual(tab.state().runs[id].log, []);
    assert.equal(tab.state().records.length, 1);
    const record = tab.state().records[0];
    assert.equal(record.type, id);
    assert.ok(record.id.startsWith(id + ':'));
    if (id === 'duel') {
      assert.equal(record.difficulty, 'expert');
      assert.match(record.label, /Expert/);
    }
    const reloaded = await session(null, tab.storage.get('alibi-afterhours-v1'));
    assert.deepEqual(reloaded.state().records, tab.state().records);
    assert.deepEqual(reloaded.state().runs[id].log, []);
  });
}

test('retaining a finished result is idempotent when the journal already contains it', async () => {
  const first = await open(fixture('tictactoe'), 'tictactoe');
  await first.action('restart', { id: 'tictactoe' });
  const records = first.state().records;
  assert.equal(records.length, 1);
  const second = await open(fixture('tictactoe', records), 'tictactoe');
  await second.action('restart', { id: 'tictactoe' });
  assert.deepEqual(second.state().records, records, 'no new date, score or duplicate entry');
});

test('a previously trimmed result returns without exceeding the 100-record journal bound', async () => {
  const records = Array.from({ length: 100 }, (_, i) => ({
    id: 'old-' + i,
    type: 'tictactoe',
    label: 'Two at the table',
    score: 0,
    date: '2026-09-27T00:00:00.000Z',
  }));
  const tab = await open(fixture('tictactoe', records), 'tictactoe');
  await tab.action('restart', { id: 'tictactoe' });
  assert.equal(tab.state().records.length, 100);
  assert.match(tab.state().records[0].id, /^tictactoe:/);
  assert.deepEqual(tab.state().records.slice(1), records.slice(0, 99));
});

test('Next garden retains the original level and score before replacing its board', async () => {
  const tab = await open(fixture('regiongardens'), 'regiongardens');
  await tab.action('garden-level', { value: '1' });
  assert.equal(tab.dialogs.length, 0);
  assert.equal(tab.state().runs.regiongardens.level, 1);
  assert.equal(tab.state().records[0]?.label, gardens[0].title);
  assert.equal(tab.state().records[0]?.score, gardens[0].solution.length);
});

for (const [name, value] of [
  ['duel-strength', 'learner'],
  ['duel-mode', 'local'],
]) {
  test(`${name}: a finished match is recorded using the old strength and seat`, async () => {
    const tab = await open(fixture('duel'), 'duel');
    await tab.action(name, { value });
    assert.equal(tab.dialogs.length, 0);
    assert.equal(tab.state().records[0]?.difficulty, 'expert');
    assert.match(tab.state().records[0]?.label || '', /Against the keeper · Expert/);
    assert.equal(tab.state().runs.duel[name === 'duel-strength' ? 'difficulty' : 'mode'], value);
  });
  test(`${name}: an unfinished match still asks and records no result`, async () => {
    const data = fixture('duel');
    data.runs.duel.log = data.runs.duel.log.slice(0, 2);
    const tab = await open(data, 'duel');
    const before = tab.state();
    await tab.action(name, { value });
    assert.equal(tab.dialogs.length, 1);
    assert.deepEqual(tab.state(), before, 'opening or dismissing confirmation changes nothing');
    await tab.action('reset-confirm');
    assert.equal(tab.state().records.length, 0);
    assert.deepEqual(tab.state().runs.duel.log, []);
  });
}

test('invalid strength refuses replacement without creating a result', async () => {
  const tab = await open(fixture('duel'), 'duel');
  const before = tab.state();
  await tab.action('duel-strength', { value: 'not-a-strength' });
  assert.deepEqual(tab.state(), before);
  assert.match(tab.messages.at(-1), /Unknown Lantern Duel strength/);
});

test('a revision-exhausted completed save cannot be changed by replay', async () => {
  const raw = JSON.stringify({ rev: Number.MAX_SAFE_INTEGER, data: fixture('tictactoe') });
  const tab = await session(null, raw);
  await tab.club.onRoute({ page: 'salon', id: 'tictactoe' });
  const before = tab.state();
  await tab.action('restart', { id: 'tictactoe' });
  assert.deepEqual(tab.state(), before, 'guard runs before record creation');
  assert.equal(tab.storage.get('alibi-afterhours-v1'), raw);
  assert.match(tab.messages.at(-1), /save warning/);
});

test('Play again exposes a stable focus target across a completed-to-fresh render', async () => {
  const tab = await open(fixture('tictactoe'), 'tictactoe');
  const id = 'id="club-control-restart-tictactoe"';
  assert.equal(tab.club.roomPage('tictactoe').split(id).length - 1, 1);
  await tab.action('restart', { id: 'tictactoe' });
  assert.equal(tab.club.roomPage('tictactoe').split(id).length - 1, 1);
});

test('Next garden moves focus to the new board status after the old control disappears', async () => {
  const tab = await open(fixture('regiongardens'), 'regiongardens');
  let focused = 0;
  tab.nodes.set('garden-status', {
    focus() {
      focused++;
    },
    scrollIntoView() {},
  });
  await tab.action('garden-level', { value: '1' });
  assert.equal(focused, 1);
  assert.equal(tab.state().runs.regiongardens.level, 1);
});
