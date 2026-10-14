'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(
  process.env.ALIBI_APP_SOURCE || path.join(__dirname, '../src/app.js'),
  'utf8',
);
function between(start, end) {
  assert.equal(app.split(start).length, 2);
  assert.equal(app.split(end).length, 2);
  return app.slice(app.indexOf(start), app.indexOf(end));
}
const source =
  between('  function enqueueSave()', '  function savePreferences()') +
  between('  function completion()', '  function act(action,') +
  between('  function endPaint()', "  document.addEventListener(\n    'pointerdown',");

async function complete({
  journeyThrows,
  theatreThrows,
  journeyAlwaysThrows = false,
  paint = false,
}) {
  const calls = [],
    saves = [],
    dialogs = [],
    journeys = [];
  const saveLabel = { textContent: '' };
  const current = {
    key: 'fixture@1',
    puzzle: { id: 'fixture', type: 'sudoku' },
    state: { cell: 0 },
    undo: [],
    redo: [],
    moves: 0,
    hints: 0,
    completedAt: null,
    firstCompletedAt: null,
  };
  const context = {
    current,
    C: { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b), clone: structuredClone },
    E: { sudoku: { complete: (_p, state) => state.cell === 1 } },
    AlibiClub: { projected: (_p, state) => ({ state }) },
    AlibiJourney(run, event, seconds) {
      journeys.push({ run, event, seconds });
      calls.push(event || 'puzzle.started');
      if (journeyAlwaysThrows || (event === 'puzzle.completed' && journeyThrows))
        throw Error('fixture journey failure');
    },
    AlibiTheatre: {
      moment(event) {
        calls.push('theatre.' + event);
        if (theatreThrows) throw Error('fixture completion theatre failure');
      },
    },
    store: {
      mode: 'persistent',
      async saveRun(snapshot, revision) {
        saves.push({ snapshot, revision });
        return { rev: 1, updatedAt: 'fixture' };
      },
    },
    sessionSeconds: 42,
    drag: null,
    lastPointerAt: 0,
    paused: true,
    reviewing: true,
    checking: true,
    feedback: 'before completion',
    updateRequested: false,
    storageFatal: false,
    saveError: null,
    pendingSaves: 0,
    queue: Promise.resolve(),
    revs: new Map(),
    records: new Map([[current.key, current]]),
    channel: null,
    $: () => saveLabel,
    setSaveLabel: () => calls.push('save-label'),
    feedbackSound: () => calls.push('feedback'),
    render: () => calls.push('render'),
    toast: () => assert.fail('a successful save must not show an error'),
    books: [],
    route: {},
    solved: (run) => !!run.completedAt,
    icon: () => '',
    esc: (text) => text,
    chapterReveal: () => '',
    dialog: (...args) => (calls.push('dialog'), dialogs.push(args)),
  };
  vm.createContext(context);
  if (paint) {
    current.state = { cell: 1 };
    context.checking = false;
    context.feedback = '';
    context.drag = { key: current.key, before: { cell: 0 } };
    vm.runInContext(source + '\nendPaint();', context);
    assert.equal(context.drag, null);
    assert.ok(context.lastPointerAt > 0);
  } else {
    assert.equal(vm.runInContext(source + '\ncommit({cell:1});', context), true);
  }
  assert.equal(context.pendingSaves, 1, 'the completed snapshot enters the actual save queue');
  assert.equal(context.paused, false);
  assert.equal(context.reviewing, false);
  assert.equal(context.checking, false);
  assert.equal(context.feedback, '');
  assert.match(current.completedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(current.firstCompletedAt, current.completedAt);
  assert.equal(current.moves, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(current.state)), { cell: 1 });
  assert.deepEqual(calls, [
    'puzzle.started',
    'feedback',
    'puzzle.completed',
    'theatre.complete',
    'render',
    'dialog',
    'render',
  ]);
  assert.equal(journeys.length, 2);
  assert.equal(journeys[0].run, current);
  assert.equal(journeys[0].event, undefined, 'the ordinary Journey call is preserved');
  assert.equal(journeys[1].run, current);
  assert.equal(journeys[1].event, 'puzzle.completed');
  assert.equal(journeys[1].seconds, 42);
  assert.equal(dialogs.length, 1);
  assert.equal(dialogs[0][0], 'That satisfying “aha”.');
  assert.match(dialogs[0][1], /Every constraint is satisfied/);
  await context.queue;
  assert.equal(context.pendingSaves, 0, 'the queue drains after saving');
  assert.equal(context.saveError, null);
  assert.equal(calls.at(-1), 'save-label');
  assert.equal(saves.length, 1);
  assert.equal(saves[0].revision, 0);
  const snapshot = saves[0].snapshot;
  assert.notEqual(snapshot, current, 'storage receives a snapshot');
  assert.deepEqual(snapshot.state, { cell: 1 });
  assert.equal(snapshot.completedAt, current.completedAt);
  assert.equal(snapshot.firstCompletedAt, current.firstCompletedAt);
  assert.equal(snapshot.elapsed, 42);
  assert.equal(snapshot.moves, 1);
  assert.equal(context.revs.get(current.key), 1);
}

test('actual completion commits and saves when Journey throws', () =>
  complete({ journeyThrows: true, theatreThrows: false }));
test('actual completion commits and saves when Theatre throws', () =>
  complete({ journeyThrows: false, theatreThrows: true }));
test('actual completion commits and saves when both hooks throw', () =>
  complete({ journeyThrows: true, theatreThrows: true }));
test('actual completion commits and saves when both hooks succeed', () =>
  complete({ journeyThrows: false, theatreThrows: false }));
test('actual commit completes and saves when Journey throws on every invocation', () =>
  complete({ journeyAlwaysThrows: true, theatreThrows: false }));
test('actual painted move completes and saves when Journey throws on every invocation', () =>
  complete({ journeyAlwaysThrows: true, theatreThrows: false, paint: true }));
