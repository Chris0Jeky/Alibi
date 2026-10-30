'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/presentation.js');
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const start = source.indexOf('  function boardCell(');
const end = source.indexOf('  function bridgesBoard(', start);
assert.ok(start > 0 && end > start, 'exercise actual board, cell and legend functions');
const names = { lightup: 'litCells', aquarium: 'aquariumCells', network: 'networkInfo' };
const pack = require('../content/extra/master-grandmaster-studies.json');

function renderer(perCell = false) {
  const calls = Object.fromEntries(Object.values(names).map((name) => [name, 0]));
  const X = { ...C.extras };
  for (const name of Object.values(names))
    X[name] = (...args) => {
      calls[name]++;
      return C.extras[name](...args);
    };
  const ctx = vm.createContext({
    C,
    X,
    E: C.registry,
    range: C.range,
    M: globalThis.AlibiUI.data,
    icon: globalThis.AlibiUI.icon,
    checking: false,
    zoomed: false,
    selectedCell: 0,
    esc: (v) =>
      String(v ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      ),
  });
  vm.runInContext(source.slice(start, end), ctx);
  if (perCell) {
    // Independent reference: discard the shared result and analyze anew for each cell/legend.
    const cell = ctx.boardCell,
      legend = ctx.boardLegend;
    ctx.boardCell = (p, s, i, errors) => cell(p, s, i, errors, X[names[p.type]](p, s));
    ctx.boardLegend = (p, s) => legend(p, s, X[names[p.type]](p, s));
  }
  return {
    ctx,
    calls,
    render(p, s) {
      for (const name in calls) calls[name] = 0;
      return ctx.board(p, s);
    },
  };
}

function fixture(type) {
  const p = pack.puzzles.find((p) => p.type === type);
  assert.ok(p);
  const before = C.registry[type].initial(p);
  const action =
    type === 'aquarium'
      ? { type: 'level', tank: 0, value: 1 }
      : type === 'network'
        ? { type: 'rotate', cell: C.range(p.size ** 2).find((i) => !p.locked.includes(i)) }
        : { type: 'set', cell: p.walls.indexOf(-2), value: 1 };
  const after = C.registry[type].reduce(p, before, action);
  assert.notDeepEqual(after, before, 'fixture performs a real move');
  return { p, before, after };
}

for (const type of Object.keys(names)) {
  test(`${type}: markup matches per-cell analysis before and after a move`, () => {
    const { p, before, after } = fixture(type);
    const actual = renderer(),
      reference = renderer(true);
    for (const checking of [false, true]) {
      actual.ctx.checking = reference.ctx.checking = checking;
      const markup = [];
      for (const s of [before, after, before]) {
        const snapshot = JSON.stringify({ p, s });
        markup.push(actual.render(p, s));
        assert.equal(markup.at(-1), reference.render(p, s));
        assert.ok(reference.calls[names[type]] >= p.size ** 2, 'reference analyzes per cell');
        assert.equal(JSON.stringify({ p, s }), snapshot, 'render preserves input');
      }
      assert.notEqual(markup[0], markup[1], 'move updates rendered analysis');
      assert.equal(markup[0], markup[2], 're-rendering the earlier state stays fresh');
    }
  });

  test(`${type}: one analysis per render, shared with headers and legend`, () => {
    const { p, before, after } = fixture(type),
      actual = renderer();
    for (const s of [before, after, before]) {
      actual.render(p, s);
      for (const [family, name] of Object.entries(names))
        assert.equal(actual.calls[name], family === type ? 1 : 0, name);
    }
  });
}
