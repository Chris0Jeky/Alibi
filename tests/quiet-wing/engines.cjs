'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const E = require('../../src/quiet-wing/engine.js');
require('../../src/quiet-wing/realm.js');
const R = global.QWRealm;
let checks = 0;
const ok = (v, s) => {
    assert.ok(v, s);
    checks++;
  },
  eq = (a, b, s) => {
    assert.deepEqual(a, b, s);
    checks++;
  },
  reject = (f, s) => {
    assert.throws(f, undefined, s);
    checks++;
  };
const sol = {};
for (const name of ['harbour', 'garden', 'empty']) {
  let sc = E.preset(name);
  eq(E.validateScene(sc), sc, 'Preset round trip ' + name);
  const mesh = R.worldMeshes(sc);
  ok(mesh.length === 196);
  for (const tile of mesh)
    for (const face of tile.faces) {
      ok(/^#[a-f0-9]{6}$/i.test(face.c), 'Material is a real RGB colour');
      ok(face.v.length >= 3);
      for (const v of face.v) ok(v.length === 3 && v.every(Number.isFinite), 'Finite geometry');
    }
}
for (const type of Object.keys(E.TYPES))
  for (const palette of Object.keys(E.PALETTES)) {
    const model = R.model(type, palette);
    ok(model.length > 0);
    ok(R.thumbnail(type, palette).startsWith('<svg'));
    for (const f of model) {
      ok(f.v.flat().every(Number.isFinite));
      ok(/^#[a-f0-9]{6}$/i.test(f.c));
    }
  }
let sc = E.emptyScene(),
  p = E.editScene(sc, { kind: 'build', type: 'stone', palette: 'terracotta', index: 0 });
ok(!p.error);
sc = E.applyEdit(sc, p);
eq(E.applyEdit(sc, p, true), E.emptyScene());
for (let i = 0; i < 3; i++) {
  p = E.editScene(sc, { kind: 'build', type: 'timber', palette: 'sage', index: 0 });
  ok(!p.error);
  sc = E.applyEdit(sc, p);
}
ok(E.editScene(sc, { kind: 'build', type: 'roof', palette: 'sage', index: 0 }).error);
sc = E.emptyScene();
sc.tiles[0].ground = 'water';
ok(E.editScene(sc, { kind: 'build', type: 'cottage', palette: 'sage', index: 0 }).error);
sc = E.applyEdit(sc, E.editScene(sc, { kind: 'build', type: 'stone', palette: 'sage', index: 0 }));
p = E.editScene(sc, { kind: 'build', type: 'cottage', palette: 'sage', index: 0 });
ok(!p.error, 'Foundation supports building on water');
sc = E.applyEdit(sc, p);
eq(E.validateScene(sc), sc);
ok(E.editScene(sc, { kind: 'build', type: 'roof', palette: 'sage', index: 0 }).error);
for (const invalid of [null, {}, { ...sc, schema: 99 }, { ...sc, size: 900 }, { ...sc, tiles: [] }])
  reject(() => E.validateScene(invalid));
let bad = E.clone(sc);
bad.tiles[0].items[0].type = '__proto__';
reject(() => E.validateScene(bad));
bad = E.clone(sc);
bad.tiles[0].items[0].palette = 'constructor';
reject(() => E.validateScene(bad));
bad = E.clone(sc);
bad.tiles[0].items[0].type = 'roof';
reject(() => E.validateScene(bad));
const now = 1_800_000_000_000,
  state = E.newState(now);
eq(E.growth(null, now), 0);
ok(E.plant(state, 0, 'clover', now));
ok(!E.plant(state, 0, 'clover', now));
eq(E.growth(state.garden.pots[0], now - 10000), 0);
eq(E.growth(state.garden.pots[0], now + 60000), 0.5);
ok(!E.harvest(state, 0, now + 100000));
ok(E.harvest(state, 0, now + 120000));
eq(state.garden.pressed, 1);
ok(!E.harvest(state, 0, now + 130000), 'No double collect');
eq(E.growth({ seed: 'lavender', plantedAt: now }, now + 40 * 86400000), 1);
function moves(id) {
  if (id.startsWith('hanoi'))
    return [0, 1, 2].flatMap((from) => [0, 1, 2].map((to) => ({ from, to })));
  if (id === 'river') return [0, 1, 2, 3].map((item) => ({ item }));
  if (id === 'jugs')
    return [0, 1].flatMap((i) => ['fill', 'empty', 'pour'].map((kind) => ({ i, kind })));
  if (id.startsWith('slide-')) return Array.from({ length: 9 }, (_, cell) => ({ cell }));
}
function key(s) {
  return JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'moves')));
}
function bfs(id) {
  let start = E.classicInitial(id),
    nodes = [{ state: start, prev: -1, action: null }],
    seen = new Set([key(start)]);
  for (let i = 0; i < nodes.length && i < 400000; i++) {
    const n = nodes[i];
    if (E.classicWon(n.state)) {
      const out = [];
      for (let j = i; nodes[j].prev >= 0; j = nodes[j].prev) out.push(nodes[j].action);
      return out.reverse();
    }
    for (const a of moves(id)) {
      const r = E.classicMove(n.state, a);
      if (r.error) continue;
      const k = key(r.state);
      if (seen.has(k)) continue;
      seen.add(k);
      nodes.push({ state: r.state, prev: i, action: a });
    }
  }
  throw Error('No solution ' + id);
}
for (const id of [
  'hanoi3',
  'hanoi4',
  'hanoi5',
  'river',
  'jugs',
  'slide-town',
  'slide-wave',
  'slide-portrait',
  'slide-bedroom',
  'slide-sunday',
]) {
  const a = bfs(id);
  let s = E.classicInitial(id);
  for (const act of a) {
    const before = JSON.stringify(s),
      r = E.classicMove(s, act);
    eq(JSON.stringify(s), before, 'Pure reducer');
    ok(!r.error);
    s = r.state;
  }
  ok(E.classicWon(s));
  sol[id] = a;
  if (id.startsWith('hanoi')) eq(a.length, 2 ** +id.at(-1) - 1);
}
sol.queens = [0, 12, 23, 29, 34, 46, 49, 59].map((cell) => ({ cell }));
let q = E.classicInitial('queens');
for (const a of sol.queens) {
  const r = E.classicMove(q, a);
  ok(!r.error);
  q = r.state;
}
ok(E.classicWon(q));
ok(E.classicMove({ ...q, q: [0] }, { cell: 9 }).error);
let m = E.classicInitial('magic'),
  target = [8, 1, 6, 3, 5, 7, 4, 9, 2];
sol.magic = [];
for (let i = 0; i < 9; i++)
  if (m.values[i] !== target[i]) {
    let a = { from: i, to: m.values.indexOf(target[i]) };
    sol.magic.push(a);
    m = E.classicMove(m, a).state;
  }
ok(E.classicWon(m));
function knight(path) {
  if (path.length === 25) return path;
  const last = path.at(-1);
  const opts = Array.from({ length: 25 }, (_, i) => i)
    .filter(
      (k) =>
        !path.includes(k) &&
        Math.abs((k % 5) - (last % 5)) * Math.abs(Math.floor(k / 5) - Math.floor(last / 5)) === 2,
    )
    .sort((a, b) => degree(a, path) - degree(b, path));
  for (const k of opts) {
    const v = knight([...path, k]);
    if (v) return v;
  }
}
function degree(a, p) {
  return Array.from({ length: 25 }, (_, k) => k).filter(
    (k) =>
      !p.includes(k) &&
      Math.abs((k % 5) - (a % 5)) * Math.abs(Math.floor(k / 5) - Math.floor(a / 5)) === 2,
  ).length;
}
sol.knight = knight([0]).map((cell) => ({ cell }));
let k = E.classicInitial('knight');
for (const a of sol.knight) {
  let r = E.classicMove(k, a);
  ok(!r.error);
  k = r.state;
}
ok(E.classicWon(k));
for (const [id, actions] of Object.entries(sol)) {
  const s = E.newState(now);
  s.classics[id] = { actions, state: { id: 'FORGED' } };
  const restored = E.validateState(s);
  ok(E.classicWon(restored.classics[id].state), 'Replay reconstructs actual solved state ' + id);
}
let corrupt = E.newState(now);
corrupt.classics.hanoi3 = {
  actions: [
    { from: 0, to: 2 },
    { from: 0, to: 2 },
  ],
  state: {},
};
ok(!E.validateState(corrupt).classics.hanoi3);
reject(() => E.validateState({ ...corrupt, schema: 8 }));
let awards = E.newState(now);
eq(E.award(awards, now), [], 'A demo village does not immediately award anything');
awards.stats.built = 1;
ok(E.award(awards, now).includes('first-stone'));
eq(E.award(awards, now + 1), [], 'Badges are idempotent');
eq(E.BADGES.length, 25);
fs.writeFileSync(path.join(__dirname, 'solutions.json'), JSON.stringify(sol, null, 2));
const report = {
  passed: true,
  assertions: checks,
  scope:
    'Parameterized pure reducers, canonical import validation, geometry, classic solvers and badge idempotency. Not human playtesting.',
  classicSolutions: Object.fromEntries(Object.entries(sol).map(([k, v]) => [k, v.length])),
};
fs.writeFileSync(path.join(__dirname, 'engine-results.json'), JSON.stringify(report, null, 2));
console.log(report);
