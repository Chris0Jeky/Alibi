'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('src/app.js', 'utf8');
const club = fs.readFileSync('src/club.js', 'utf8');
const start = app.indexOf('  async function loadReasoning()');
const end = app.indexOf('  function applyReveal()', start);
const forcedStart =
  club.indexOf("} else if (a === 'forced') {") + "} else if (a === 'forced') {".length;
const forcedEnd = club.indexOf("      } else if (a === 'forced-apply')", forcedStart);
assert.ok(start >= 0 && end > start && forcedStart > 0 && forcedEnd > forcedStart);

function fixture(method) {
  let resolve, reject;
  const pending = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const shown = [],
    messages = [],
    deductions = [];
  const modal = { firstChild: {}, open: method === 'reviewRecord' };
  const context = {
    current: {
      key: 'fixture@1',
      puzzle: { type: 'sudoku', title: 'Fixture' },
      state: {},
      completedAt: method === 'reviewRecord',
    },
    paused: false,
    route: {},
    C: { loadInsights: () => pending },
    $: () => modal,
    blocked: () => false,
    esc: (text) => text,
    toast: (message) => messages.push(message),
    dialog: (...args) => shown.push(args),
    notify: (message) => messages.push(message),
    clone: (value) => JSON.parse(JSON.stringify(value)),
  };
  context.root = context;
  vm.createContext(context);
  vm.runInContext(
    app.slice(start, end) +
      `
    const bridge = { current: () => current, insights: loadReasoning, dialog };
    async function forced() { ${club.slice(forcedStart, forcedEnd)} }
  `,
    context,
  );
  const insights = {
    deduction: (p, s) => {
      deductions.push([p, s]);
      return { rule: 'Clue', message: 'Forced.', cells: [0], value: 1 };
    },
    recap: (p, s) => {
      deductions.push([p, s]);
      return ['Completed.'];
    },
  };
  return {
    context,
    modal,
    shown,
    messages,
    deductions,
    resolve: () => resolve(insights),
    reject,
    run: () => context[method](),
  };
}

for (const method of ['showHint', 'reviewRecord', 'forced']) {
  test(`${method} waits for reasoning and uses the unchanged live board`, async () => {
    const f = fixture(method),
      pending = f.run();
    assert.equal(f.shown.length, 0);
    assert.equal(f.deductions.length, 0);
    f.resolve();
    await pending;
    assert.equal(f.deductions.length, 1);
    assert.equal(f.deductions[0][1], f.context.current.state);
    assert.equal(f.shown.length, 1);
  });
  for (const [name, change] of [
    [
      'navigation',
      (f) => {
        f.context.current = null;
      },
    ],
    [
      'a move',
      (f) => {
        f.context.current.state = {};
      },
    ],
    [
      'pause',
      (f) => {
        f.context.paused = true;
      },
    ],
    [
      'another dialog',
      (f) => {
        f.modal.firstChild = {};
      },
    ],
    [
      'dialog open or close',
      (f) => {
        f.modal.open = !f.modal.open;
      },
    ],
  ]) {
    test(`${method} drops delayed work after ${name}`, async () => {
      const f = fixture(method),
        pending = f.run();
      change(f);
      f.resolve();
      await pending;
      assert.equal(f.shown.length, 0);
      assert.equal(f.deductions.length, 0);
      assert.equal(f.messages.length, 0);
    });
  }
  test(`${method} reports a load failure only while its request still owns the UI`, async () => {
    for (const stale of [false, true]) {
      const f = fixture(method),
        pending = f.run();
      if (stale) f.context.current = null;
      f.reject(new Error('Reasoning hints could not load. Try again.'));
      await pending;
      assert.equal(f.messages.length, stale ? 0 : 1);
      assert.equal(f.shown.length, 0);
    }
  });
}
