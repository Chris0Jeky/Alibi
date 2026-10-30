'use strict';
// Issue #896: startup validates up to 101 states per saved row, so per-puzzle work was hoisted out
// of the aquarium and bridges validateState (and the aquarium water-level definition check).
// This pins "pure refactor": the frozen pre-change implementations below must agree with the
// shipped ones, outcome and message, on every official puzzle and on mutated puzzles and states.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'src', 'core.js'));
require(path.join(ROOT, 'src', 'engines.js'));
const C = require(path.join(ROOT, 'src', 'bridges.js'));
const { load } = require(path.join(ROOT, 'tools', 'official-catalogue.cjs'));

const { clone, range } = C;
const catalog = load(ROOT, false);

// ---- frozen copies of the implementations as they were before the change ----
const extra = ['dossier', 'witness', 'lightup', 'tents', 'aquarium', 'network', 'trail'];
function oldTankRows(p) {
  return range(Math.max(...p.tanks) + 1).map((t) =>
    [
      ...new Set(
        range(p.size ** 2)
          .filter((i) => p.tanks[i] === t)
          .map((i) => Math.floor(i / p.size)),
      ),
    ].sort((a, b) => b - a),
  );
}
function oldExtraState(p, s, fallback) {
  if (!extra.includes(p.type)) return fallback(p, s);
  if (
    !s ||
    typeof s !== 'object' ||
    !s.notes ||
    typeof s.notes !== 'object' ||
    Array.isArray(s.notes) ||
    Object.keys(s.notes).length !== 0
  )
    throw new Error('Invalid puzzle state.');
  const n = p.size,
    N = n * n,
    ints = (a, len, lo, hi) =>
      Array.isArray(a) &&
      a.length === len &&
      a.every((v) => Number.isInteger(v) && v >= lo && v <= hi),
    acc = (x) => x === null || (Number.isInteger(x) && x >= 0 && x < n);
  let good = true;
  if (p.type === 'dossier')
    good =
      ints(s.marks, 2 * N, -1, 1) &&
      Array.isArray(s.clueMarks) &&
      s.clueMarks.length <= p.clues.length &&
      s.clueMarks.every((i) => Number.isInteger(i) && i >= 0 && i < p.clues.length) &&
      acc(s.accused);
  if (p.type === 'witness') good = ints(s.marks, p.statements.length, -1, 1) && acc(s.accused);
  if (['lightup', 'tents'].includes(p.type))
    good =
      ints(s.cells, N, -1, 1) &&
      (p.type === 'lightup'
        ? s.cells.every((v, i) => p.walls[i] === -2 || v === -1)
        : p.trees.every((i) => s.cells[i] === -1));
  if (p.type === 'aquarium')
    good =
      ints(s.levels, oldTankRows(p).length, 0, n) &&
      s.levels.every((v, i) => v <= oldTankRows(p)[i].length);
  if (p.type === 'network')
    good = ints(s.rotations, N, 0, 3) && p.locked.every((i) => s.rotations[i] === 0);
  if (p.type === 'trail')
    good = ints(s.cells, N, 0, N) && p.givens.every((v, i) => v === 0 || v === s.cells[i]);
  if (!good) throw new Error('Invalid or incompatible saved board. Nothing was replaced.');
  return clone(s);
}
function oldBridgesGraph(p) {
  const xy = p.islands.map(({ cell }) => ({ x: cell % p.size, y: Math.floor(cell / p.size) }));
  const edges = [];
  for (let a = 0; a < xy.length; a++) {
    for (const horizontal of [true, false]) {
      const targets = xy
        .map((point, b) => ({ ...point, b }))
        .filter((point) =>
          horizontal
            ? point.y === xy[a].y && point.x > xy[a].x
            : point.x === xy[a].x && point.y > xy[a].y,
        );
      targets.sort((u, v) => (horizontal ? u.x - v.x : u.y - v.y));
      if (targets.length) edges.push({ a, b: targets[0].b, horizontal });
    }
  }
  const incident = xy.map((_, i) => edges.flatMap((e, j) => (e.a === i || e.b === i ? [j] : [])));
  const crosses = edges.map(() => []);
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) {
      const e = edges[i],
        f = edges[j];
      if (e.horizontal === f.horizontal) continue;
      const h = e.horizontal ? e : f,
        v = e.horizontal ? f : e;
      if (
        xy[v.a].x > xy[h.a].x &&
        xy[v.a].x < xy[h.b].x &&
        xy[h.a].y > xy[v.a].y &&
        xy[h.a].y < xy[v.b].y
      ) {
        crosses[i].push(j);
        crosses[j].push(i);
      }
    }
  return { xy, edges, incident, crosses };
}
function oldBridgesState(p, s) {
  const integer = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  if (
    !s ||
    Array.isArray(s) ||
    !Array.isArray(s.cells) ||
    s.cells.length !== oldBridgesGraph(p).edges.length ||
    !s.cells.every((v) => integer(v, 0, 2)) ||
    !s.notes ||
    Array.isArray(s.notes) ||
    typeof s.notes !== 'object' ||
    Object.keys(s.notes).length
  )
    throw new Error('Invalid or incompatible saved bridges. Nothing was replaced.');
  return C.clone(s);
}
// Non-aquarium/bridges types never changed, so the shipped function is its own reference there.
const shipped = C.validateState;
const oldState = (p, s) =>
  p.type === 'bridges' ? oldBridgesState(p, s) : oldExtraState(p, s, shipped);

// ---- deterministic randomness and mutation ----
let seed = 896;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const outcome = (fn, p, s) => {
  try {
    return { ok: clone(fn(p, s)) };
  } catch (e) {
    return { error: `${e.name}: ${e.message}` };
  }
};
const junk = [null, undefined, -1, 0, 1, 2, 3, 99, 1.5, NaN, '1', true, [], {}, 'x'];
function mutate(value) {
  const v = clone(value);
  const slots = [];
  (function walk(node) {
    if (node && typeof node === 'object')
      for (const k of Object.keys(node)) {
        slots.push([node, k]);
        walk(node[k]);
      }
  })(v);
  if (!slots.length || rnd() < 0.08) return pick(junk);
  const [node, key] = pick(slots);
  const roll = rnd();
  if (Array.isArray(node) && roll < 0.2) node.pop();
  else if (Array.isArray(node) && roll < 0.35) node.push(pick(junk));
  else if (roll < 0.45) delete node[key];
  else if (roll < 0.55 && typeof node[key] === 'number') node[key] += pick([-1, 1, 5, -5]);
  else node[key] = pick(junk);
  return v;
}
function solved(p) {
  const s = clone(C.registry[p.type].initial(p));
  if (p.type === 'scene') s.placements = clone(p.solution);
  else
    for (const k of ['cells', 'levels', 'rotations'])
      if (Array.isArray(s[k]) && Array.isArray(p.solution) && s[k].length === p.solution.length)
        s[k] = p.solution.slice();
  return s;
}

const types = ['aquarium', 'bridges', ...extra.filter((t) => t !== 'aquarium')];
const official = catalog.puzzles.filter((p) => types.includes(p.type));

test('catalogue covers every changed seam', () => {
  assert.ok(official.filter((p) => p.type === 'aquarium').length >= 40);
  assert.ok(official.filter((p) => p.type === 'bridges').length >= 40);
});

test('validateState matches the pre-change implementation on every official puzzle', () => {
  let accepted = 0,
    rejected = 0;
  for (const p of official) {
    const base = [C.registry[p.type].initial(p), solved(p)];
    const states = [...base];
    for (let i = 0; i < 40; i++) states.push(mutate(pick(base)));
    for (const s of states) {
      const was = outcome(oldState, p, s),
        now = outcome(shipped, p, s);
      assert.deepEqual(now, was, `${p.id}: ${JSON.stringify(s)}`);
      if (now.ok) accepted++;
      else rejected++;
    }
  }
  // Both branches must be exercised or the comparison proves nothing.
  assert.ok(accepted > official.length, `accepted ${accepted}`);
  assert.ok(rejected > official.length, `rejected ${rejected}`);
});

test('validateState matches on mutated aquarium and bridges definitions', () => {
  for (const type of ['aquarium', 'bridges']) {
    for (const p of official.filter((q) => q.type === type)) {
      const s = C.registry[type].initial(p);
      for (let i = 0; i < 12; i++) {
        const q = mutate(p);
        if (!q || typeof q !== 'object') continue;
        for (const state of [s, solved(p), mutate(s)]) {
          const was = outcome(oldState, q, state),
            now = outcome(shipped, q, state);
          assert.deepEqual(now, was, `${p.id} mutated`);
        }
      }
    }
  }
});

test('a run of many states validates the same and without cross-state leakage', () => {
  // One puzzle object shared by ~100 states, as validateRun does for undo and redo.
  for (const type of ['aquarium', 'bridges']) {
    const p = official.find((q) => q.type === type);
    const ini = C.registry[type].initial(p);
    for (let i = 0; i < 101; i++) {
      const s = i % 3 === 0 ? mutate(ini) : i % 2 ? solved(p) : ini;
      assert.deepEqual(outcome(shipped, p, s), outcome(oldState, p, s));
    }
  }
});

test('aquarium definition water-level check agrees with the pre-change predicate', () => {
  const reference = (p) => {
    const count = Math.max(...p.tanks) + 1;
    const levels = p.solution;
    return (
      Array.isArray(levels) &&
      levels.length === count &&
      levels.every((v) => Number.isInteger(v) && v >= 0 && v <= p.size) &&
      !levels.some((v, i) => v > oldTankRows(p)[i].length)
    );
  };
  let sawFail = 0,
    sawPass = 0;
  for (const p of official.filter((q) => q.type === 'aquarium')) {
    for (let i = 0; i < 20; i++) {
      const q = clone(p);
      if (i) q.solution = q.solution.map((v) => (rnd() < 0.3 ? v + pick([-1, 1, 3]) : v));
      let message = null;
      try {
        C.validateDefinition(q);
      } catch (e) {
        message = e.message;
      }
      if (message?.endsWith('Invalid water levels.')) {
        assert.equal(reference(q), false, p.id);
        sawFail++;
      } else if (message === null) {
        assert.equal(reference(q), true, p.id);
        sawPass++;
      }
    }
  }
  assert.ok(sawFail > 0 && sawPass > 0, `fail ${sawFail}, pass ${sawPass}`);
});
