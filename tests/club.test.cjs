'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/bridges.js');
require('../src/insights.js');
const A = require('../src/assist.js'),
  E = require('../src/club-engines.js'),
  pack = require('../content/catalog.json');
let checks = 0;
const ok = (v, m) => {
    assert.ok(v, m);
    checks++;
  },
  eq = (a, b, m) => {
    assert.deepEqual(a, b, m);
    checks++;
  },
  bad = (f, m) => {
    assert.throws(f, undefined, m);
    checks++;
  };
const results = [];
// Every published solution remains locally feasible as correct placements are added.
for (const p of pack.puzzles) {
  const engine = C.registry[p.type];
  let s = engine.initial(p);
  if (['sudoku', 'futoshiki', 'binary', 'tents', 'lightup'].includes(p.type))
    for (let i = 0; i < p.size * p.size; i++) {
      if (['tents', 'lightup'].includes(p.type) && p.solution[i] !== 1) continue;
      if (p.givens && s.cells[i] === p.solution[i]) continue;
      eq(A.reason(p, s, i, p.solution[i]), '', p.id + ' assistance preserves correct move ' + i);
      s = engine.reduce(p, s, { type: 'set', cell: i, value: p.solution[i] });
    }
  if (p.type === 'scene')
    for (const who of p.people) {
      eq(A.reason(p, s, p.solution[who.id], null, who.id), '', p.id + ' scene feasible ' + who.id);
      s = engine.reduce(p, s, { type: 'place', who: who.id, cell: p.solution[who.id] });
    }
  if (p.type === 'tents') {
    const q = A.project(p, s).state;
    for (let i = 0; i < p.size * p.size; i++)
      if (p.solution[i] === 1) eq(q.cells[i], 1, p.id + ' tidy does not erase a tent');
  }
}
const dossier = pack.puzzles.find((p) => p.type === 'dossier'),
  ds = C.registry.dossier.initial(dossier),
  n = dossier.size;
ds.marks[0] = 1;
ds.marks[1] = 0;
const snap = C.clone(ds),
  projected = A.project(dossier, ds);
eq(ds, snap, 'Projection never edits saved manual state');
eq(projected.state.marks[n], 0, 'YES projects a column exclusion');
ok(projected.derived[n], 'Derived mark carries its reason');
const removed = C.clone(ds);
removed.marks[0] = -1;
eq(A.project(dossier, removed).state.marks[n], -1, 'Undoing the premise restores availability');
eq(A.project(dossier, removed).state.marks[1], 0, 'Manual crossing survives premise change');
eq(A.project(dossier, ds, false).state, ds, 'Assistance off leaves the board alone');
const non = { type: 'nonogram', size: 3, rowClues: [[1], [1], [1]], colClues: [[1], [1], [1]] },
  ns = { cells: [1, -1, -1, -1, -1, -1, -1, -1, -1], notes: {} };
eq(A.project(non, ns).state.cells[1], 0, 'Finished picture line gets derived crosses');
ns.cells[0] = -1;
ok(!A.project(non, ns).derived[1], 'Picture row premise removal removes its projection');
const wall = { type: 'lightup', size: 3, walls: [-2, 0, -2, -2, -2, -2, -2, -2, -2] };
ok(
  A.reason(wall, { cells: Array(9).fill(-1) }, 0, 1).includes('numbered'),
  'Zero wall excludes adjacent lantern',
);
const sudo = pack.puzzles.find((p) => p.type === 'sudoku'),
  ss = C.registry.sudoku.initial(sudo),
  i = ss.cells.findIndex((v) => !v),
  v = sudo.solution[i];
const solvedNoAnswer = C.clone(sudo);
delete solvedNoAnswer.solution;
eq(
  A.candidates(solvedNoAnswer, ss, i),
  A.candidates(sudo, ss, i),
  'Candidates do not need a stored solution',
);
const deduction = C.insights.deduction(solvedNoAnswer, ss);
ok(!!deduction, 'A human deduction can run without stored solution');
// Deterministic town rules, boundaries, replay and scoring.
for (let seed = 0; seed < 80; seed++) {
  let s = E.borough.initial('CHECK-' + seed);
  eq(s, E.borough.initial('CHECK-' + seed), 'Seed determinism ' + seed);
  eq(new Set(s.offers).size, 3, 'Opening offers provide three choices ' + seed);
  const initial = E.copy(s);
  for (let turn = 0; turn < 18; turn++) {
    const cell = s.board.findIndex((x) => !x),
      slot = turn % 3,
      before = E.copy(s);
    s = E.borough.move(s, slot, cell);
    eq(before.board[cell], null, 'Town reducer preserves input');
  }
  ok(s.done, 'Eighteen builds complete town');
  eq(E.borough.replay(s.seed, s.log), s, 'Replay reconstructs exact town');
  bad(() => E.borough.move(s, 0, 0), 'Finished towns reject extra move');
  eq(initial.turn, 0, 'Initial town remains unchanged');
}
const town = E.borough.initial('POINTS');
town.board = Array(25).fill(null);
town.board[0] = 'home';
town.board[1] = 'garden';
town.board[5] = 'cafe';
eq(E.borough.breakdown(town).slice(0, 2), [4, 2], 'Cottage plus garden scoring');
eq(E.borough.breakdown(town)[5], 4, 'Cafe scores adjacent cottage');
eq(E.neighbors(4), [9, 3], 'Board neighbours cannot wrap at the edge');
bad(() => E.borough.initial('<script>'), 'Unsafe seed rejected');
bad(() => E.borough.replay('A', [{ slot: 5, cell: 0 }]), 'Illegal plan rejected');
bad(
  () => E.borough.replay('A', [{ slot: 0, cell: 0, score: 999 }]),
  'Replay refuses caller-supplied score',
);
// Full legal matches, immutability, passes and AI validity.
let sawPass = false;
for (let k = 0; k < 80; k++) {
  let s = E.reversi.initial(),
    rnd = E.random('duel' + k),
    turns = 0;
  eq(E.reversi.legal(s).length, 4, 'Four opening duel moves');
  while (!s.done && turns < 40) {
    const legal = E.reversi.legal(s),
      cell = legal[Math.floor(rnd() * legal.length)],
      old = E.copy(s),
      q = E.reversi.move(s, cell);
    eq(s, old, 'Duel move does not mutate input');
    eq(
      q.board.filter(Boolean).length,
      s.board.filter(Boolean).length + 1,
      'Each move adds one occupied square',
    );
    ok(q.board[cell] === s.turn, 'Placed lantern belongs to moving player');
    s = q;
    turns++;
    sawPass = sawPass || !!s.passed;
  }
  ok(s.done && turns <= 32, 'Duel always terminates within 32 moves');
  eq(E.reversi.legal(s), [], 'Terminal board has no legal actions');
  bad(() => E.reversi.move(s, 0), 'No move after result');
}
ok(sawPass, 'Random complete matches exercised automatic pass');
for (let k = 1; k < 15; k++) {
  let s = E.reversi.initial();
  for (let j = 0; j < k && !s.done; j++)
    s = E.reversi.move(s, E.reversi.legal(s)[j % E.reversi.legal(s).length]);
  const old = E.copy(s),
    best = E.reversi.best(s, 4);
  if (best) ok(E.reversi.legal(s).includes(best.cell), 'Bounded bot returns a legal move');
  eq(s, old, 'Search never mutates board');
}
// Original archive maps must actually be playable.
for (let level = 0; level < E.warehouse.maps.length; level++) {
  let s = E.warehouse.initial(level);
  const t = performance.now(),
    result = E.warehouse.solve(s);
  ok(result.path, 'Archive room has a solution ' + level);
  for (const ch of result.path) {
    const before = E.copy(s),
      next = E.warehouse.move(s, { U: 'up', R: 'right', D: 'down', L: 'left' }[ch]);
    eq(s, before, 'Archive move preserves input');
    s = next;
  }
  ok(s.done, 'Verified plan completes archive ' + level);
  results.push({
    level,
    path: result.path,
    nodes: result.nodes,
    milliseconds: Math.round(performance.now() - t),
  });
}
fs.writeFileSync(
  path.join(__dirname, 'club-results.json'),
  JSON.stringify(
    {
      passed: true,
      assertions: checks,
      scope: 'Pure engines and reversible assistance, no cloud or physical-device test',
      archiveSolutions: results,
    },
    null,
    2,
  ),
);
console.log('PASS', checks, 'club-engine and assistance assertions.');
