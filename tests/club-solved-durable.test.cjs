'use strict';
// #407: Archive Heist and Lantern Gardens solved markers must survive the 100-record journal cap.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/backup-validation.js');
const E = require('../src/club-engines.js');
const { validateSave } = AlibiBackupValidation(C, null, () => E, 4);
const text = fs.readFileSync(require.resolve('../src/club.js'), 'utf8');
const between = (from, to) => text.slice(text.indexOf(from), text.indexOf(to));
const source =
  between('function cleared(', 'function archivePage(') +
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

test('solved vault and garden markers outlive 100 later journal records', () => {
  const f = fixture();
  solve(f, 'archive', 9, { pushes: 12 });
  solve(f, 'regiongardens', 2, {});
  assert.equal(f.cleared('archive', 9), true);
  fillJournal(f, 100);
  assert.equal(f.state.records.length, 100);
  assert.ok(
    !f.state.records.some((x) => x.type === 'archive' || x.type === 'regiongardens'),
    'the journal itself has pruned the old completions',
  );
  assert.equal(f.cleared('archive', 9), true, 'vault room 10 stays solved');
  assert.equal(f.cleared('regiongardens', 2), true, 'garden 3 stays solved');
  assert.equal(f.cleared('archive', 10), false, 'unsolved rooms stay open');
  assert.equal(f.cleared('regiongardens', 0), false);
  assert.deepEqual(JSON.parse(JSON.stringify(validateSave({ ...f.state, runs: {} }))).cleared, [
    'archive:9',
    'regiongardens:2',
  ]);
});

test('imported record ids outside the room set never reach the solved set', () => {
  const f = fixture();
  f.state.records.push(
    { id: 'archive:77:abc', type: 'archive', label: 'x', score: 1, date: '2026-01-01' },
    { id: 'regiongardens:01:abc', type: 'regiongardens', label: 'x', score: 1, date: '2026-01-01' },
  );
  fillJournal(f, 1);
  assert.deepEqual([...f.state.cleared], ['regiongardens:1']);
  assert.doesNotThrow(
    () => validateSave({ ...f.state, runs: {} }),
    'the save still loads after the next record',
  );
});

test('Club saves validate the optional solved set', () => {
  const base = fixture().state;
  assert.doesNotThrow(() => validateSave(base), 'older saves without the field still load');
  assert.doesNotThrow(() => validateSave({ ...base, cleared: ['archive:0', 'archive:32'] }));
  for (const cleared of [
    'archive:1',
    {},
    ['archive:33'],
    ['regiongardens:9'],
    ['archive:01'],
    ['archive:-1'],
    ['duel:0'],
    [5],
    Array(101).fill('archive:0'),
  ])
    assert.throws(() => validateSave({ ...base, cleared }), /Invalid solved rooms/);
});
