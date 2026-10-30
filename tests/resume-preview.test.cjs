'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../src/core.js');
require('../src/presentation.js');
const UI = globalThis.AlibiUI;
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const ctx = vm.createContext({
  records: new Map(),
  prefs: { favorites: [] },
  route: { page: 'library' },
  AlibiUI: UI,
  AlibiCuration: { collections: [], get: () => undefined },
  M: UI.data,
  icon: UI.icon,
  esc: String,
  puzzleMeta: (p) => `${p.size} × ${p.size}`,
  difficulty: (value) => value,
});
for (const [from, to] of [
  ['  function keyFor(', '  function activeRecords('],
  ['  function openAttrs(', '  function bookCard('],
]) {
  const start = source.indexOf(from),
    end = source.indexOf(to, start);
  assert.ok(start > 0 && end > start, 'exercise actual card and saved-run selection');
  vm.runInContext(source.slice(start, end), ctx);
}

function puzzle(type = 'nonogram', size = 4) {
  return {
    id: 'preview',
    revision: 1,
    type,
    size,
    title: 'Saved picture',
    difficulty: 'Gentle',
    get solution() {
      throw new Error('Card previews must never read the solution');
    },
  };
}
function render(p, run) {
  ctx.records.clear();
  if (run) ctx.records.set('preview@1', run);
  return ctx.puzzleCard(p);
}
function art(markup) {
  return markup.match(/<svg\b[^>]*class="puzzle-art"[^>]*>[\s\S]*?<\/svg>/)?.[0];
}
function filled(markup) {
  const svg = art(markup);
  assert.ok(svg, 'card contains puzzle art');
  const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)];
  assert.equal(paths.length, 1, 'one filled-cell path');
  const d = paths[0][1];
  const squares = [...d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)];
  assert.equal(squares.map((m) => m[0]).join(''), d, 'only unit squares are drawn');
  return squares.map((m) => [+m[1], +m[2]]);
}
function saved(p) {
  let state = C.registry.nonogram.initial(p);
  for (const [cell, value] of [
    [0, 1],
    [3, 0],
    [6, 1],
    [15, 1],
  ])
    state = C.registry.nonogram.reduce(p, state, { type: 'set', cell, value });
  return { moves: 4, state };
}

test('in-progress card draws exactly saved filled cells without reading solution or mutating state', () => {
  const p = puzzle(),
    run = saved(p),
    before = JSON.stringify(run);
  let markup;
  assert.doesNotThrow(() => {
    markup = render(p, run);
  });
  assert.deepEqual(filled(markup), [
    [0, 0],
    [2, 1],
    [3, 3],
  ]);
  assert.equal(JSON.stringify(run), before);
  assert.match(markup, /<div class="card-art" aria-hidden="true"/);
  assert.match(art(markup), /aria-hidden="true" focusable="false"/);
  assert.match(
    markup,
    /class="card-open" aria-label="Saved picture, Picture logic, Gentle, 4 × 4, In progress"/,
  );
});

test('changing a saved filled cell changes the card preview', () => {
  const p = puzzle(),
    run = saved(p),
    before = art(render(p, run));
  run.state = C.registry.nonogram.reduce(p, run.state, { type: 'set', cell: 6, value: -1 });
  const after = render(p, run);
  assert.notEqual(art(after), before);
  assert.deepEqual(filled(after), [
    [0, 0],
    [3, 3],
  ]);
});

test('an active board containing only crosses and empty cells draws no fills', () => {
  const p = puzzle(),
    run = saved(p);
  run.state.cells = run.state.cells.map((v) => (v === 1 ? -1 : v));
  assert.deepEqual(filled(render(p, run)), []);
});

test('completed and unstarted cards retain the exact decorative motif', () => {
  const p = puzzle(),
    run = saved(p);
  const motif = UI.art(
    p.type,
    p,
    [...p.id].reduce((n, c) => n + c.charCodeAt(0), 0),
  );
  for (const record of [
    undefined,
    { ...run, moves: 0 },
    { ...run, completedAt: 'today' },
    { ...run, firstCompletedAt: 'yesterday' },
  ])
    assert.equal(art(render(p, record)), motif);
});

test('saved previews use the actual grid size, including the largest nonogram', () => {
  const p = puzzle('nonogram', 15),
    state = C.registry.nonogram.initial(p);
  state.cells[224] = 1;
  assert.deepEqual(filled(render(p, { moves: 1, state })), [[14, 14]]);
});

test('other families keep their decorative art during active runs', () => {
  const p = puzzle('binary'),
    run = { moves: 1, state: { cells: [1] } };
  assert.equal(art(render(p, run)), art(render(p)));
});
