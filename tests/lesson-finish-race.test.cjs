'use strict';
// Issue #530: a lesson completion whose preferences save is still pending must
// not close, render, or navigate once the route or lesson has moved on.
// These fixtures execute the real lessonFinish from src/app.js with only its
// dependencies stubbed; the save promise is resolved by each test to simulate
// the IndexedDB callback delay already reproduced by the coordinator.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  process.env.ALIBI_APP_SOURCE || path.join(root, 'src/app.js'),
  'utf8',
);
const start = source.indexOf('async function lessonFinish() {');
assert.ok(start >= 0, 'lessonFinish must be present in src/app.js');
const end = source.indexOf('function download(', start);
assert.ok(end > start, 'download must follow lessonFinish in src/app.js');
const fnSource = source.slice(start, end);

function harness({ currentType = null } = {}) {
  const puzzles = [
    { id: 'binary-01', revision: 1, type: 'binary' },
    { id: 'binary-02', revision: 1, type: 'binary' },
  ];
  const calls = { closeDialog: 0, render: 0, revealed: 0, navigated: [], saves: 0 };
  let resolveSave = null;
  const saveGate = new Promise((resolve) => {
    resolveSave = resolve;
  });
  const context = {
    lesson: { type: 'binary' },
    prefs: { seen: [] },
    routeSerial: 7,
    current: currentType ? { puzzle: { type: currentType } } : null,
    savePreferences() {
      calls.saves += 1;
      return saveGate;
    },
    closeDialog() {
      calls.closeDialog += 1;
    },
    render() {
      calls.render += 1;
    },
    revealPlayBoard() {
      calls.revealed += 1;
    },
    navigate(page, id) {
      calls.navigated.push([page, id]);
    },
    all() {
      return puzzles;
    },
    rec(p) {
      return p.record;
    },
    solved(run) {
      return !!run;
    },
    keyFor(p) {
      return `${p.id}@${p.revision}`;
    },
  };
  vm.createContext(context);
  vm.runInContext(`${fnSource}\nglobalThis.__lessonFinish = lessonFinish;`, context);
  return {
    context,
    calls,
    finish: () => context.__lessonFinish(),
    settle: () => resolveSave(),
  };
}

test('normal completion navigates to an eligible same-family puzzle', async () => {
  const h = harness();
  const pending = h.finish();
  h.settle();
  await pending;
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(Array.from(h.context.prefs.seen), ['binary']);
  assert.equal(h.calls.closeDialog, 1);
  assert.deepEqual(h.calls.navigated, [['play', 'binary-01@1']]);
  assert.equal(h.calls.render, 0);
  assert.equal(h.calls.revealed, 0);
});

test('completion on the current same-family puzzle renders and reveals it', async () => {
  const h = harness({ currentType: 'binary' });
  const pending = h.finish();
  h.settle();
  await pending;
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(Array.from(h.context.prefs.seen), ['binary']);
  assert.equal(h.calls.closeDialog, 1);
  assert.equal(h.calls.render, 1);
  assert.equal(h.calls.revealed, 1);
  assert.deepEqual(h.calls.navigated, []);
});

test('a newer route while the save is delayed receives no stale effects', async () => {
  // Without the fix this finishes the old lesson: dialog closes and the
  // router navigates even though the user already moved on.
  const h = harness();
  const pending = h.finish();
  h.context.routeSerial += 1;
  h.context.lesson = null;
  h.settle();
  await pending;
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(Array.from(h.context.prefs.seen), ['binary']);
  assert.equal(h.calls.closeDialog, 0);
  assert.equal(h.calls.render, 0);
  assert.equal(h.calls.revealed, 0);
  assert.deepEqual(h.calls.navigated, []);
});

test('a replaced lesson with unchanged routeSerial remains untouched', async () => {
  // Without the fix the stale completion still closes the new lesson dialog
  // and navigates away from whatever replaced it.
  const h = harness();
  const pending = h.finish();
  h.context.lesson = { type: 'binary' };
  h.settle();
  await pending;
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(Array.from(h.context.prefs.seen), ['binary']);
  assert.equal(h.calls.closeDialog, 0);
  assert.equal(h.calls.render, 0);
  assert.equal(h.calls.revealed, 0);
  assert.deepEqual(h.calls.navigated, []);
});
