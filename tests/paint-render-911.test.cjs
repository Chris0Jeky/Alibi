'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(require('node:path').join(__dirname, '../src/app.js'), 'utf8');
const source = app.slice(
  app.indexOf('  function paintTo(i)'),
  app.indexOf("  document.addEventListener(\n    'pointerdown',"),
);

function fixture() {
  const frames = new Map(),
    calls = [];
  let id = 0;
  const context = {
    C: { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b), clone: structuredClone },
    E: {
      nonogram: {
        reduce: (_p, s, a) => ({ cells: s.cells.map((v, i) => (i === a.cell ? a.value : v)) }),
      },
    },
    AlibiClub: { assistance: () => 'off' },
    render: () => calls.push('render'),
    feedbackSound: () => calls.push('feedback'),
    completion: () => calls.push('completion'),
    enqueueSave: () => calls.push('save'),
    requestAnimationFrame: (fn) => {
      frames.set(++id, fn);
      return id;
    },
    cancelAnimationFrame: (n) => frames.delete(n),
    calls,
  };
  vm.runInNewContext(
    `
    let current = {key:'k', puzzle:{type:'nonogram'}, state:{cells:[-1,-1]}, undo:[], redo:[], moves:0},
      drag = null, paused = false, updateRequested = false, restoreBusy = false, lastPointerAt = 0,
      selectedCell = -1, checking = false, feedback = '', reviewing = false;
    function locked() { return false; }
    ${source}
    globalThis.api = { start() { drag = {key:current.key, before:C.clone(current.state), value:1, visited:new Set()}; },
      paintTo, endPaint, current: () => current };
  `,
    context,
  );
  return {
    ...context,
    flush() {
      for (const [key, fn] of frames) {
        frames.delete(key);
        fn();
      }
    },
  };
}

test('quick paint gesture renders once and commits once', () => {
  const f = fixture();
  f.api.start();
  f.api.paintTo(0);
  f.api.endPaint();
  f.flush();
  assert.deepEqual(f.calls, ['feedback', 'completion', 'save', 'render']);
  assert.equal(f.api.current().moves, 1);
  assert.equal(f.api.current().undo.length, 1);
});

test('held drag renders painted cells before release and commits one undo entry', () => {
  const f = fixture();
  f.api.start();
  f.api.paintTo(0);
  f.flush();
  f.api.paintTo(1);
  f.flush();
  f.api.endPaint();
  assert.deepEqual(f.calls, ['render', 'render', 'feedback', 'completion', 'save', 'render']);
  assert.equal(f.api.current().moves, 1);
  assert.deepEqual(Array.from(f.api.current().undo[0].cells), [-1, -1]);
});

test('multiple cells visited in one frame share a render', () => {
  const f = fixture();
  f.api.start();
  f.api.paintTo(0);
  f.api.paintTo(1);
  f.flush();
  assert.deepEqual(f.calls, ['render']);
  f.api.endPaint();
  assert.equal(f.api.current().undo.length, 1);
});
