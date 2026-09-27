'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const start = app.indexOf('  function completion() {');
const end = app.indexOf('  function act(action, opts = {}) {', start);
assert.ok(start >= 0 && end > start, 'the real completion and commit functions must be present');

function harness({ journeyThrows = false, theatreThrows = false } = {}) {
  const calls = { journey: 0, theatre: 0, dialogs: [], renders: 0, saves: 0 };
  const context = {
    current: {
      puzzle: { id: 'sudoku-hook-test', type: 'sudoku', title: 'Hook test' },
      state: { cells: [0] },
      undo: [],
      redo: [],
      moves: 0,
      hints: 0,
      completedAt: null,
      firstCompletedAt: null,
    },
    paused: true,
    reviewing: false,
    checking: false,
    feedback: '',
    sessionSeconds: 23,
    route: {},
    books: [],
    store: { mode: 'device' },
    E: {
      sudoku: {
        complete(_puzzle, state) {
          return state.cells[0] === 1;
        },
      },
    },
    AlibiClub: { projected: (_puzzle, state) => ({ state }) },
    C: {
      equal: (left, right) => left.cells[0] === right.cells[0],
      clone: (value) => structuredClone(value),
    },
    AlibiJourney(_run, event) {
      calls.journey++;
      if (journeyThrows && event === 'puzzle.completed') throw Error('journey hook failed');
    },
    AlibiTheatre: {
      moment() {
        calls.theatre++;
        if (theatreThrows) throw Error('theatre hook failed');
      },
    },
    render() {
      calls.renders++;
    },
    enqueueSave() {
      calls.saves++;
    },
    dialog(title, body, actions) {
      calls.dialogs.push({ title, body, actions });
    },
    icon: () => '',
    esc: (value) => String(value),
    chapterReveal: () => '',
    solved: (run) => Boolean(run.completedAt),
    rec: () => null,
    find: () => null,
    feedbackSound() {},
    structuredClone,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${app.slice(start, end)}\nglobalThis.runCommit = commit;`, context, {
    filename: 'app-completion-slice.js',
  });
  return { context, calls };
}

for (const failingHook of ['journey', 'theatre']) {
  test(`a throwing ${failingHook} hook cannot block completion, saving or the success dialog`, () => {
    const h = harness({
      journeyThrows: failingHook === 'journey',
      theatreThrows: failingHook === 'theatre',
    });

    assert.equal(h.context.runCommit({ cells: [1] }), true);
    assert.ok(h.context.current.completedAt, 'the run is marked complete');
    assert.equal(
      h.context.current.firstCompletedAt,
      h.context.current.completedAt,
      'first completion is retained',
    );
    assert.equal(h.context.paused, false, 'the completed board is visible');
    assert.equal(h.calls.dialogs.length, 1, 'the success dialog opens');
    assert.equal(h.calls.saves, 1, 'the completed run reaches the save queue');
    assert.ok(h.calls.renders >= 1, 'the completed board renders');
  });
}
