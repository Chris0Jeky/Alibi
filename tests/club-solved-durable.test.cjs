'use strict';
// Durable Club progress must survive the 100-record journal cap.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { session } = require('./helpers/club-session.cjs');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/backup-validation.js');
const E = require('../src/club-engines.js');
const { validateSave } = AlibiBackupValidation(C, null, () => E, 4);
const text = fs.readFileSync(require.resolve('../src/club.js'), 'utf8');
const between = (from, to) => text.slice(text.indexOf(from), text.indexOf(to));
const source =
  between('function boroughBestTable(', 'function archivePage(') +
  between('function record(', 'function profile(');

function fixture() {
  const state = {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 1,
    lastHero: -1,
    runs: {},
    records: [],
    stamps: [],
  };
  const context = vm.createContext({ E: () => E, state, saves: 0 });
  vm.runInContext(
    source + '\nfunction save() { saves++; }\nthis.cleared = cleared; this.record = record;',
    context,
  );
  return context;
}
function solve(f, id, level, s) {
  f.state.runs[id] = { level, log: ['up', 'left', String(level)], redo: [] };
  f.record(id, { done: true, ...s });
}
function fillJournal(f, count) {
  for (let i = 0; i < count; i++) {
    f.state.runs.tictactoe = { mode: 'local', log: [i], redo: [] };
    f.record('tictactoe', { done: true, winner: 1 });
  }
}

function finishedDuel() {
  let s = E.reversi.initial();
  while (!s.done) s = E.reversi.move(s, E.reversi.legal(s)[0]);
  return s;
}

function finishedBorough(seed) {
  let s = E.borough.initial(seed);
  while (!s.done)
    s = E.borough.move(
      s,
      0,
      s.board.findIndex((x) => !x),
    );
  return s;
}

test('solved vault and garden markers outlive 100 later journal records', () => {
  const f = fixture();
  solve(f, 'archive', 9, { pushes: 12 });
  solve(f, 'regiongardens', 2, {});
  assert.equal(f.cleared('archive:9:'), true);
  fillJournal(f, 100);
  assert.equal(f.state.records.length, 100);
  assert.ok(
    !f.state.records.some((x) => x.type === 'archive' || x.type === 'regiongardens'),
    'the journal itself has pruned the old completions',
  );
  assert.equal(f.cleared('archive:9:'), true, 'vault room 10 stays solved');
  assert.equal(f.cleared('regiongardens:2:'), true, 'garden 3 stays solved');
  assert.equal(f.cleared('archive:10:'), false, 'unsolved rooms stay open');
  assert.equal(f.cleared('regiongardens:0:'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(validateSave({ ...f.state, runs: {} }))).cleared, [
    'archive:9:',
    'regiongardens:2:',
  ]);
});

test('Duel and Borough stamps outlive 100 later journal records', async () => {
  const f = fixture();
  const duel = finishedDuel();
  f.state.runs.duel = { mode: 'local', difficulty: 'keeper', log: duel.log, redo: [] };
  f.record('duel', duel);

  const borough = finishedBorough('STAMP-01');
  f.state.runs.borough = { seed: borough.seed, log: borough.log, redo: [] };
  f.record('borough', borough);

  fillJournal(f, 100);
  assert.equal(f.state.records.length, 100);
  assert.ok(!f.state.records.some((x) => x.type === 'duel' || x.type === 'borough'));
  assert.equal(f.cleared('duel:'), true, 'a completed match remains collected');
  assert.equal(f.cleared('borough:'), true, 'a completed town remains collected');
  assert.deepEqual(JSON.parse(JSON.stringify(validateSave({ ...f.state, runs: {} }))).cleared, [
    'duel:',
    'borough:',
  ]);

  const legacy = { ...f.state, runs: {} };
  delete legacy.cleared;
  assert.doesNotThrow(() => validateSave(legacy), 'pre-progress saves still load');

  const profileState = { ...f.state, runs: {} };
  const tab = await session(profileState, null, { context: { AlibiAssets: { badge: () => '' } } });
  await tab.club.onRoute({ page: 'club' });
  const html = tab.club.profile();
  assert.match(html, /<div class="club-stamp earned"><strong>Town planner<\/strong>/);
  assert.match(html, /<div class="club-stamp earned"><strong>A seat at the table<\/strong>/);
});

test('imported record ids the validator would refuse never reach the solved set', () => {
  const f = fixture();
  for (const id of [
    'archive:01:a',
    'archive:00:a',
    'archive:100:a',
    'duel:7:a',
    'duel:local:a',
    'borough:PLANNING-1:a',
    'regiongardens:7:a',
  ])
    f.state.records.push({ id, type: 'archive', label: 'x', score: 1, date: '2026-01-01' });
  fillJournal(f, 100);
  assert.deepEqual([...f.state.cleared], ['regiongardens:7:']);
  assert.doesNotThrow(
    () => validateSave({ ...f.state, runs: {} }),
    'the save still loads after the next record',
  );
  assert.equal(f.cleared('duel:'), false, 'unrelated record ids cannot grant the Duel stamp');
  assert.equal(f.cleared('borough:'), false, 'unrelated record ids cannot grant the Borough stamp');
});

test('Club saves validate the optional solved set', () => {
  const base = fixture().state,
    every = ['archive', 'regiongardens'].flatMap((g) =>
      Array.from({ length: 100 }, (_, i) => `${g}:${i}:`),
    );
  assert.doesNotThrow(() => validateSave(base), 'older saves without the field still load');
  assert.doesNotThrow(
    () => validateSave({ ...base, cleared: every }),
    'every prefix record() can produce fits the bound',
  );
  assert.doesNotThrow(
    () => validateSave({ ...base, cleared: [...every, 'duel:', 'borough:'] }),
    'durable game stamps are valid progress markers',
  );
  for (const cleared of [
    'archive:1:',
    {},
    ['archive:1'],
    ['archive:01:'],
    ['archive:00:'],
    ['archive:100:'],
    ['archive:-1:'],
    ['duel:0:'],
    ['duel:local:'],
    ['borough:SEED-1:'],
    [5],
    [['archive:1:']],
    [...every, 'duel:', 'borough:', 'duel:'],
  ])
    assert.throws(() => validateSave({ ...base, cleared }), /Invalid solved rooms/);
});
