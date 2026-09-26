'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'src/observatory-loader.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const start = app.indexOf("      case 'restart':");
const end = app.indexOf("      case 'next':", start);
assert.ok(start >= 0 && end > start, 'the real restart actions must be present');

function harness({ active = true, saveError = '', storageFatal = '' } = {}) {
  const events = [];
  const context = {
    ALIBI_CONFIG: { standalone: false },
    ALIBI_OBSERVATORY_URL: 'assets/observatory.test.js',
    PulseboardUsage: { status: () => ({ active }), track: (event) => (events.push(event), true) },
    document: {
      readyState: 'complete',
      createElement: () => ({}),
      head: { append() {} },
      addEventListener() {},
    },
    addEventListener() {},
    current: {
      puzzle: { type: 'sudoku' },
      state: { cells: [1] },
      undo: [{ cells: [0] }],
      redo: [],
      firstCompletedAt: '2026-09-01',
      completedAt: null,
      moves: 1,
      hints: 2,
      elapsed: 20,
      note: 'keep',
    },
    saveError,
    storageFatal,
    AlibiTheatre: { moment() {} },
    E: { sudoku: { initial: () => ({ cells: [0] }) } },
    closeDialog() {},
    dialog() {},
    enqueueSave() {
      context.saves++;
    },
    render() {
      context.renders++;
    },
    saves: 0,
    renders: 0,
  };
  vm.createContext(context);
  vm.runInContext(loader, context);
  vm.runInContext(
    'dispatch = (action) => { switch (action) {\n' + app.slice(start, end) + '\n} };',
    context,
  );
  return { context, events, call: (event) => context.AlibiJourney(context.current, event) };
}

test('accepted restart resets the journey silently before the next real mutation', () => {
  const h = harness();
  h.call();
  h.context.dispatch('restart-confirm');
  assert.deepEqual(h.events, ['puzzle.started'], 'restart is not an analytics event');
  assert.equal(h.context.current.moves, 0);
  assert.deepEqual(h.context.current.state, { cells: [0] });
  assert.equal(h.context.current.firstCompletedAt, '2026-09-01');
  assert.equal(h.context.saves, 1);
  assert.equal(h.context.renders, 1);
  h.call();
  h.call('puzzle.failed');
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.started', 'puzzle.failed']);
});

test('a terminal immediately after restart cannot close the old attempt', () => {
  const h = harness();
  h.call();
  h.context.dispatch('restart-confirm');
  assert.equal(h.call('puzzle.completed'), false);
  assert.deepEqual(h.events, ['puzzle.started']);
});

test('opening and cancelling the restart prompt preserves the open attempt', () => {
  const h = harness();
  h.call();
  h.context.dispatch('restart');
  h.context.closeDialog();
  h.call('puzzle.failed');
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.failed']);
  assert.equal(h.context.saves, 0);
  assert.equal(h.context.current.moves, 1);
});

test('storage refusal preserves the attempt and board', () => {
  for (const options of [{ saveError: 'save blocked' }, { storageFatal: 'unsupported data' }]) {
    const h = harness(options);
    h.call();
    h.context.dispatch('restart-confirm');
    h.call('puzzle.failed');
    assert.deepEqual(h.events, ['puzzle.started', 'puzzle.failed']);
    assert.equal(h.context.saves, 0);
    assert.equal(h.context.current.moves, 1);
  }
});

test('restart without the optional journey helper still completes normally', () => {
  const h = harness();
  delete h.context.AlibiJourney;
  h.context.dispatch('restart-confirm');
  assert.equal(h.context.current.moves, 0);
  assert.deepEqual(h.events, []);
});

test('restart cannot enable telemetry or retain an attempt while sharing is off', () => {
  const h = harness({ active: false });
  h.call();
  h.context.dispatch('restart-confirm');
  h.call();
  h.call('puzzle.completed');
  assert.deepEqual(h.events, []);
});
